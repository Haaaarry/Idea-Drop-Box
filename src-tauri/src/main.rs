#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Local;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::Mutex,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Idea {
    id: String,
    content: String,
    created_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Report {
    id: String,
    date: String,
    markdown: String,
    created_at: String,
    export_path: Option<String>,
    error: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    api_key: String,
    model: String,
    report_time: String,
    shortcut: String,
    export_dir: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppState {
    ideas: Vec<Idea>,
    reports: Vec<Report>,
    settings: Settings,
    shortcut_registered: bool,
}

#[derive(Clone, Serialize, Deserialize)]
struct Database {
    ideas: Vec<Idea>,
    reports: Vec<Report>,
    settings: Settings,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsInput {
    api_key: Option<String>,
    model: Option<String>,
    report_time: Option<String>,
    shortcut: Option<String>,
    export_dir: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GenerateReportResult {
    report: Report,
    export_error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateSettingsResult {
    settings: Settings,
    shortcut_registered: bool,
}

struct AppData {
    db: Mutex<Database>,
    db_path: PathBuf,
    shortcut_registered: Mutex<bool>,
    last_auto_report: Mutex<Option<String>>,
}

fn default_settings() -> Settings {
    Settings {
        api_key: String::new(),
        model: "deepseek-chat".to_string(),
        report_time: "23:00".to_string(),
        shortcut: "Ctrl+Alt+Space".to_string(),
        export_dir: String::new(),
    }
}

fn normalize_settings(input: Settings) -> Settings {
    let default = default_settings();
    Settings {
        api_key: input.api_key.trim().to_string(),
        model: non_empty(input.model, default.model),
        report_time: if is_valid_time(&input.report_time) {
            input.report_time
        } else {
            default.report_time
        },
        shortcut: non_empty(input.shortcut, default.shortcut),
        export_dir: input.export_dir.trim().to_string(),
    }
}

fn non_empty(value: String, fallback: String) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        fallback
    } else {
        trimmed.to_string()
    }
}

fn is_valid_time(value: &str) -> bool {
    let Some((hour, minute)) = value.split_once(':') else {
        return false;
    };
    let Ok(hour) = hour.parse::<u32>() else {
        return false;
    };
    let Ok(minute) = minute.parse::<u32>() else {
        return false;
    };
    hour < 24 && minute < 60
}

fn load_database(path: PathBuf) -> Database {
    let default = Database {
        ideas: vec![],
        reports: vec![],
        settings: default_settings(),
    };
    let Ok(raw) = fs::read_to_string(path) else {
        return default;
    };
    match serde_json::from_str::<Database>(&raw) {
        Ok(mut db) => {
            db.settings = normalize_settings(db.settings);
            db
        }
        Err(_) => default,
    }
}

fn save_database(data: &AppData) -> Result<(), String> {
    let db = data.db.lock().map_err(|_| "数据锁定失败".to_string())?;
    if let Some(parent) = data.db_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let raw = serde_json::to_string_pretty(&*db).map_err(|err| err.to_string())?;
    fs::write(&data.db_path, raw).map_err(|err| err.to_string())
}

fn local_date_key() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

fn local_time_key() -> String {
    Local::now().format("%H:%M").to_string()
}

fn idea_date_key(idea: &Idea) -> String {
    chrono::DateTime::parse_from_rfc3339(&idea.created_at)
        .map(|date| date.with_timezone(&Local).format("%Y-%m-%d").to_string())
        .unwrap_or_else(|_| local_date_key())
}

fn format_idea_time(idea: &Idea) -> String {
    chrono::DateTime::parse_from_rfc3339(&idea.created_at)
        .map(|date| date.with_timezone(&Local).format("%H:%M").to_string())
        .unwrap_or_else(|_| "--:--".to_string())
}

fn fallback_report(date: &str, ideas: &[Idea], reason: &str) -> String {
    let idea_lines = if ideas.is_empty() {
        "- 今天还没有记录想法。".to_string()
    } else {
        ideas
            .iter()
            .map(|idea| format!("- {} {}", format_idea_time(idea), idea.content))
            .collect::<Vec<_>>()
            .join("\n")
    };
    format!(
        "# 今日想法日报 - {date}\n\n## 状态\n\nAI 总结未生成：{reason}\n\n## 今日想法\n\n{idea_lines}\n"
    )
}

fn no_idea_report(date: &str) -> String {
    format!("# 今日想法日报 - {date}\n\n今天没有记录想法。留白也算一种整理。\n")
}

async fn deepseek_report(settings: &Settings, date: &str, ideas: &[Idea]) -> Result<String, String> {
    #[derive(Serialize)]
    struct Message {
        role: &'static str,
        content: String,
    }

    #[derive(Serialize)]
    struct RequestBody {
        model: String,
        temperature: f32,
        messages: Vec<Message>,
    }

    #[derive(Deserialize)]
    struct ApiMessage {
        content: Option<String>,
    }

    #[derive(Deserialize)]
    struct Choice {
        message: Option<ApiMessage>,
    }

    #[derive(Deserialize)]
    struct ApiError {
        message: Option<String>,
    }

    #[derive(Deserialize)]
    struct ApiResponse {
        choices: Option<Vec<Choice>>,
        error: Option<ApiError>,
    }

    let ideas_text = ideas
        .iter()
        .map(|idea| format!("- {}: {}", idea.created_at, idea.content))
        .collect::<Vec<_>>()
        .join("\n");
    let prompt = format!(
        "日期：{date}\n\n今天记录的想法：\n{ideas_text}\n\n请输出 Markdown，包含：\n1. 一句话总览\n2. 主题归类\n3. 值得继续推进的 3 个线索\n4. 明天可以做的小行动\n5. 原始想法列表"
    );

    let body = RequestBody {
        model: settings.model.clone(),
        temperature: 0.4,
        messages: vec![
            Message {
                role: "system",
                content: "你是一个私人想法日报编辑。请把零散想法整理成清晰、温暖、可行动的中文 Markdown 日报。".to_string(),
            },
            Message {
                role: "user",
                content: prompt,
            },
        ],
    };

    let response = Client::new()
        .post("https://api.deepseek.com/chat/completions")
        .bearer_auth(&settings.api_key)
        .json(&body)
        .send()
        .await
        .map_err(|err| err.to_string())?;
    let status = response.status();
    let data = response.json::<ApiResponse>().await.map_err(|err| err.to_string())?;
    if !status.is_success() {
        return Err(data
            .error
            .and_then(|error| error.message)
            .unwrap_or_else(|| format!("DeepSeek request failed with {status}")));
    }
    data.choices
        .and_then(|choices| choices.into_iter().next())
        .and_then(|choice| choice.message)
        .and_then(|message| message.content)
        .map(|content| content.trim().to_string())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "DeepSeek returned an empty report".to_string())
}

fn emit_data_changed(app: &AppHandle) {
    let _ = app.emit("data-changed", ());
}

fn show_capture(app: &AppHandle) {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }
    if let Some(window) = app.get_webview_window("capture") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("capture-focus", ());
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_on_close(window: &WebviewWindow) {
    let cloned = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = cloned.hide();
        }
    });
}

fn register_shortcut(app: &AppHandle, shortcut: &str) -> bool {
    let manager = app.global_shortcut();
    let _ = manager.unregister_all();
    manager.register(shortcut).is_ok()
}

#[tauri::command]
fn get_state(state: tauri::State<AppData>) -> Result<AppState, String> {
    let db = state.db.lock().map_err(|_| "数据锁定失败".to_string())?;
    let shortcut_registered = *state
        .shortcut_registered
        .lock()
        .map_err(|_| "快捷键状态读取失败".to_string())?;
    Ok(AppState {
        ideas: db.ideas.clone(),
        reports: db.reports.clone(),
        settings: db.settings.clone(),
        shortcut_registered,
    })
}

#[tauri::command]
fn add_idea(app: AppHandle, state: tauri::State<AppData>, content: String) -> Result<Idea, String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err("想法不能为空".to_string());
    }
    let idea = Idea {
        id: Uuid::new_v4().to_string(),
        content: trimmed.to_string(),
        created_at: Local::now().to_rfc3339(),
    };
    {
        let mut db = state.db.lock().map_err(|_| "数据锁定失败".to_string())?;
        db.ideas.insert(0, idea.clone());
    }
    save_database(&state)?;
    emit_data_changed(&app);
    Ok(idea)
}

#[tauri::command]
async fn generate_report(
    app: AppHandle,
    state: tauri::State<'_, AppData>,
    date: Option<String>,
) -> Result<GenerateReportResult, String> {
    generate_report_inner(&app, &state, date.unwrap_or_else(local_date_key)).await
}

async fn generate_report_inner(
    app: &AppHandle,
    state: &tauri::State<'_, AppData>,
    date: String,
) -> Result<GenerateReportResult, String> {
    let (settings, ideas) = {
        let db = state.db.lock().map_err(|_| "数据锁定失败".to_string())?;
        let ideas = db
            .ideas
            .iter()
            .filter(|idea| idea_date_key(idea) == date)
            .cloned()
            .collect::<Vec<_>>();
        (db.settings.clone(), ideas)
    };

    let mut error = None;
    let markdown = if ideas.is_empty() {
        no_idea_report(&date)
    } else if settings.api_key.trim().is_empty() {
        let reason = "缺少 DeepSeek API Key".to_string();
        error = Some(reason.clone());
        fallback_report(&date, &ideas, &reason)
    } else {
        match deepseek_report(&settings, &date, &ideas).await {
            Ok(markdown) => markdown,
            Err(reason) => {
                error = Some(reason.clone());
                fallback_report(&date, &ideas, &reason)
            }
        }
    };

    let export_dir = if settings.export_dir.trim().is_empty() {
        app.path()
            .app_data_dir()
            .map_err(|err| err.to_string())?
            .join("reports")
    } else {
        PathBuf::from(settings.export_dir)
    };
    let mut export_error = None;
    let export_path = match export_markdown(&export_dir, &date, &markdown) {
        Ok(path) => Some(path.to_string_lossy().to_string()),
        Err(err) => {
            export_error = Some(err);
            None
        }
    };

    let report = Report {
        id: Uuid::new_v4().to_string(),
        date: date.clone(),
        markdown,
        created_at: Local::now().to_rfc3339(),
        export_path,
        error,
    };
    {
        let mut db = state.db.lock().map_err(|_| "数据锁定失败".to_string())?;
        db.reports.retain(|item| item.date != report.date);
        db.reports.insert(0, report.clone());
    }
    save_database(state)?;
    emit_data_changed(app);
    Ok(GenerateReportResult { report, export_error })
}

fn export_markdown(dir: &PathBuf, date: &str, markdown: &str) -> Result<PathBuf, String> {
    fs::create_dir_all(dir).map_err(|err| err.to_string())?;
    let path = dir.join(format!("{date}-idea-report.md"));
    fs::write(&path, markdown).map_err(|err| err.to_string())?;
    Ok(path)
}

#[tauri::command]
fn update_settings(
    app: AppHandle,
    state: tauri::State<AppData>,
    settings: SettingsInput,
) -> Result<UpdateSettingsResult, String> {
    let updated = {
        let mut db = state.db.lock().map_err(|_| "数据锁定失败".to_string())?;
        let merged = Settings {
            api_key: settings.api_key.unwrap_or_else(|| db.settings.api_key.clone()),
            model: settings.model.unwrap_or_else(|| db.settings.model.clone()),
            report_time: settings.report_time.unwrap_or_else(|| db.settings.report_time.clone()),
            shortcut: settings.shortcut.unwrap_or_else(|| db.settings.shortcut.clone()),
            export_dir: settings.export_dir.unwrap_or_else(|| db.settings.export_dir.clone()),
        };
        db.settings = normalize_settings(merged);
        db.settings.clone()
    };
    let shortcut_registered = register_shortcut(&app, &updated.shortcut);
    *state
        .shortcut_registered
        .lock()
        .map_err(|_| "快捷键状态保存失败".to_string())? = shortcut_registered;
    save_database(&state)?;
    emit_data_changed(&app);
    Ok(UpdateSettingsResult {
        settings: updated,
        shortcut_registered,
    })
}

#[tauri::command]
fn choose_export_dir() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("选择 Markdown 导出目录")
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn hide_capture(app: AppHandle) {
    if let Some(window) = app.get_webview_window("capture") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn show_main(app: AppHandle) {
    show_main_window(&app);
}

fn start_scheduler(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;
            let date = local_date_key();
            let time = local_time_key();
            let should_run = {
                let state = app.state::<AppData>();
                let Ok(db) = state.db.lock() else {
                    continue;
                };
                let Ok(last) = state.last_auto_report.lock() else {
                    continue;
                };
                db.settings.report_time == time && last.as_deref() != Some(date.as_str())
            };
            if should_run {
                let state = app.state::<AppData>();
                let _ = generate_report_inner(&app, &state, date.clone()).await;
                if let Ok(mut last) = state.last_auto_report.lock() {
                    *last = Some(date);
                };
            }
        }
    });
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        show_capture(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_dir)?;
            let db_path = app_dir.join("idea-drop-box.json");
            let db = load_database(db_path.clone());
            let shortcut = db.settings.shortcut.clone();
            app.manage(AppData {
                db: Mutex::new(db),
                db_path,
                shortcut_registered: Mutex::new(false),
                last_auto_report: Mutex::new(None),
            });

            if let Some(window) = app.get_webview_window("main") {
                hide_on_close(&window);
            }

            let registered = register_shortcut(app.handle(), &shortcut);
            let state = app.state::<AppData>();
            if let Ok(mut value) = state.shortcut_registered.lock() {
                *value = registered;
            }

            start_scheduler(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            add_idea,
            generate_report,
            update_settings,
            choose_export_dir,
            hide_capture,
            show_main
        ])
        .run(tauri::generate_context!())
        .expect("error while running Idea Drop Box");
}
