import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Clock, ExternalLink, FileText, KeyRound, Loader2, Save, Send, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import type { AppState, Idea, Report, Settings } from '../shared/types.js';
import { getLocalDateKey } from '../shared/date.js';
import { ideaBox } from './tauriApi.js';
import { loadWithStartupRetry } from './startupRetry.js';
import './styles.css';

type View = 'capture' | 'reports' | 'settings';

const EMPTY_STATE: AppState = {
  ideas: [],
  reports: [],
  settings: {
    apiKey: '',
    model: 'deepseek-chat',
    reportTime: '23:00',
    shortcut: 'Ctrl+Alt+Space',
    exportDir: ''
  },
  shortcutRegistered: false
};

function App() {
  const route = window.location.hash.includes('capture') ? 'capture' : 'main';
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await loadWithStartupRetry(() => ideaBox.getState());
    setState(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    return ideaBox.onDataChanged(refresh);
  }, [refresh]);

  if (route === 'capture') {
    return <CaptureWindow onSaved={refresh} />;
  }

  return <MainWindow state={state} loading={loading} onRefresh={refresh} />;
}

function CaptureWindow({ onSaved }: { onSaved: () => Promise<void> }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const focus = () => {
      setTimeout(() => inputRef.current?.focus(), 40);
    };
    focus();
    return ideaBox.onCaptureFocus(focus);
  }, []);

  async function save() {
    if (!content.trim() || saving) {
      return;
    }
    setSaving(true);
    await ideaBox.addIdea(content);
    setContent('');
    await onSaved();
    await ideaBox.hideCapture();
    setSaving(false);
  }

  return (
    <main className="capture-shell">
      <div className="capture-topline">
        <Sparkles size={17} />
        <span>Idea Drop Box</span>
        <button type="button" className="ghost-icon" onClick={() => ideaBox.showMain()} title="打开主窗口">
          <ExternalLink size={16} />
        </button>
      </div>
      <textarea
        ref={inputRef}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            save();
          }
          if (event.key === 'Escape') {
            ideaBox.hideCapture();
          }
        }}
        placeholder="把刚冒出来的想法放这里..."
      />
      <div className="capture-actions">
        <span>Ctrl/⌘ + Enter 保存，Esc 收起</span>
        <button type="button" onClick={save} disabled={!content.trim() || saving}>
          {saving ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          保存
        </button>
      </div>
    </main>
  );
}

function MainWindow({ state, loading, onRefresh }: { state: AppState; loading: boolean; onRefresh: () => Promise<void> }) {
  const [view, setView] = useState<View>('capture');
  const today = getLocalDateKey();
  const todayIdeas = useMemo(
    () => state.ideas.filter((idea) => getLocalDateKey(new Date(idea.createdAt)) === today),
    [state.ideas, today]
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">ID</div>
          <div>
            <h1>Idea Drop Box</h1>
            <p>{state.settings.shortcut}</p>
          </div>
        </div>
        <nav>
          <button className={view === 'capture' ? 'active' : ''} onClick={() => setView('capture')}>
            <Sparkles size={18} />
            捕获
          </button>
          <button className={view === 'reports' ? 'active' : ''} onClick={() => setView('reports')}>
            <FileText size={18} />
            日报
          </button>
          <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>
            <SettingsIcon size={18} />
            设置
          </button>
        </nav>
        <div className="sidebar-status">
          <Clock size={16} />
          <span>每日 {state.settings.reportTime}</span>
        </div>
      </aside>
      <section className="workspace">
        {loading ? <LoadingPanel /> : null}
        {!loading && view === 'capture' ? <CaptureView ideas={todayIdeas} onRefresh={onRefresh} /> : null}
        {!loading && view === 'reports' ? <ReportsView reports={state.reports} onRefresh={onRefresh} /> : null}
        {!loading && view === 'settings' ? <SettingsView state={state} onRefresh={onRefresh} /> : null}
      </section>
    </main>
  );
}

function LoadingPanel() {
  return (
    <div className="empty-panel">
      <Loader2 className="spin" />
      <span>读取本地想法...</span>
    </div>
  );
}

function CaptureView({ ideas, onRefresh }: { ideas: Idea[]; onRefresh: () => Promise<void> }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!content.trim() || saving) {
      return;
    }
    setSaving(true);
    await ideaBox.addIdea(content);
    setContent('');
    await onRefresh();
    setSaving(false);
  }

  return (
    <div className="content-stack">
      <header className="view-header">
        <div>
          <p>今日收集</p>
          <h2>{ideas.length} 条想法</h2>
        </div>
        <button type="button" onClick={() => ideaBox.showMain()}>
          <Archive size={16} />
          应用常驻中
        </button>
      </header>
      <section className="composer">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="写下一条想法、问题、灵感或待验证的判断..."
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              save();
            }
          }}
        />
        <button type="button" onClick={save} disabled={!content.trim() || saving}>
          {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
          保存想法
        </button>
      </section>
      <IdeaList ideas={ideas} />
    </div>
  );
}

function IdeaList({ ideas }: { ideas: Idea[] }) {
  if (ideas.length === 0) {
    return <div className="empty-panel">今天还没有想法。快捷键呼出小窗，先丢进来一条。</div>;
  }
  return (
    <div className="idea-list">
      {ideas.map((idea) => (
        <article className="idea-row" key={idea.id}>
          <time>{formatTime(idea.createdAt)}</time>
          <p>{idea.content}</p>
        </article>
      ))}
    </div>
  );
}

function ReportsView({ reports, onRefresh }: { reports: Report[]; onRefresh: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? '');
  const [generating, setGenerating] = useState(false);
  const selected = reports.find((report) => report.id === selectedId) ?? reports[0];

  useEffect(() => {
    if (!selectedId && reports[0]) {
      setSelectedId(reports[0].id);
    }
  }, [reports, selectedId]);

  async function generate() {
    setGenerating(true);
    const result = await ideaBox.generateReport();
    await onRefresh();
    setSelectedId(result.report.id);
    setGenerating(false);
  }

  return (
    <div className="report-layout">
      <div className="report-list">
        <header>
          <h2>想法日报</h2>
          <button type="button" onClick={generate} disabled={generating}>
            {generating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            生成今日
          </button>
        </header>
        {reports.length === 0 ? <div className="empty-panel small">还没有日报。</div> : null}
        {reports.map((report) => (
          <button
            type="button"
            key={report.id}
            className={selected?.id === report.id ? 'report-item active' : 'report-item'}
            onClick={() => setSelectedId(report.id)}
          >
            <span>{report.date}</span>
            <small>{report.error ? 'Fallback' : 'AI'}</small>
          </button>
        ))}
      </div>
      <article className="report-reader">
        {selected ? (
          <>
            <div className="report-meta">
              <span>{selected.date}</span>
              {selected.exportPath ? <code>{selected.exportPath}</code> : <span>未导出 Markdown</span>}
            </div>
            <pre>{selected.markdown}</pre>
          </>
        ) : (
          <div className="empty-panel">点击“生成今日”创建第一份日报。</div>
        )}
      </article>
    </div>
  );
}

function SettingsView({ state, onRefresh }: { state: AppState; onRefresh: () => Promise<void> }) {
  const [form, setForm] = useState<Settings>(state.settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(state.settings);
  }, [state.settings]);

  async function save() {
    setSaving(true);
    await ideaBox.updateSettings(form);
    await onRefresh();
    setSaving(false);
  }

  async function chooseDir() {
    const dir = await ideaBox.chooseExportDir();
    if (dir) {
      setForm((current) => ({ ...current, exportDir: dir }));
    }
  }

  return (
    <div className="settings-grid">
      <header className="view-header full">
        <div>
          <p>本地配置</p>
          <h2>DeepSeek 与桌面行为</h2>
        </div>
        <button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          保存设置
        </button>
      </header>
      <label>
        <span><KeyRound size={16} /> DeepSeek API Key</span>
        <input
          type="password"
          value={form.apiKey}
          onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
          placeholder="sk-..."
        />
      </label>
      <label>
        <span>模型</span>
        <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
      </label>
      <label>
        <span>日报时间</span>
        <input type="time" value={form.reportTime} onChange={(event) => setForm({ ...form, reportTime: event.target.value })} />
      </label>
      <label>
        <span>全局快捷键</span>
        <input value={form.shortcut} onChange={(event) => setForm({ ...form, shortcut: event.target.value })} />
      </label>
      <label className="wide">
        <span>Markdown 导出目录</span>
        <div className="path-picker">
          <input value={form.exportDir} onChange={(event) => setForm({ ...form, exportDir: event.target.value })} placeholder="默认使用应用数据目录" />
          <button type="button" onClick={chooseDir}>选择</button>
        </div>
      </label>
      <div className={state.shortcutRegistered ? 'status-ok' : 'status-warn'}>
        快捷键状态：{state.shortcutRegistered ? '已注册' : '注册失败，可尝试更换组合键'}
      </div>
    </div>
  );
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
