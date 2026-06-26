# Idea Drop Box

桌面端想法收集器：用全局快捷键呼出小窗口记录想法，并在每天设定时间用 DeepSeek API 生成想法日报，同时保存到应用内和 Markdown 文件。

## 当前状态

已实现 Windows 桌面版核心流程：

- 全局快捷键：默认 `Ctrl+Alt+Space`
- 快捷捕获窗口：输入后保存，`Ctrl+Enter` 提交，`Esc` 收起
- 主窗口：查看今日想法、历史日报、设置
- DeepSeek 日报：默认每天 `23:00` 自动生成，也可手动生成
- 本地保存：想法、日报、设置均保存在应用数据目录
- Markdown 导出：日报会导出为 `YYYY-MM-DD-idea-report.md`

## 快速运行

一键启动（Windows）：

双击项目根目录的 `启动项目.bat`。脚本会自动进入项目目录，缺少 `node_modules` 时先安装依赖；如果还没有 release 版桌面程序，或源码比 release 程序更新，会先构建一次，然后启动 `src-tauri/target/release/idea-drop-box.exe`。没有代码变化时再次双击会直接打开已编译好的程序，不会每次走开发编译。

停止应用：关闭应用窗口即可。启动脚本的命令行窗口只是启动器，成功启动后会自动退出。

开发运行（改代码时使用）：

```powershell
npm install
npm start
```

构建前端和 Rust 桌面程序：

```powershell
npm run build
cd src-tauri
cargo build --release
```

构建出的可执行文件在：

```text
src-tauri/target/release/idea-drop-box.exe
```

## 配置 DeepSeek

打开应用后进入“设置”页：

- 填入 `DeepSeek API Key`
- 模型默认是 `deepseek-chat`
- 日报时间默认是 `23:00`
- Markdown 导出目录为空时，使用应用数据目录下的 `reports`

如果没有配置 API Key，应用仍会生成 fallback 日报，包含当天原始想法和缺少配置的说明。

## 常用命令

```powershell
npm test
npm run typecheck
npm run build
cd src-tauri
cargo check
cargo build --release
```

## 项目结构

```text
src/renderer/          React 界面
src/renderer/tauriApi.ts  前端调用 Tauri 命令的包装
src/shared/            前后端共享的 TypeScript 类型和日期工具
src/main/              TypeScript 核心逻辑测试用模块
src-tauri/src/main.rs  Tauri 后端：窗口、快捷键、存储、定时、DeepSeek、导出
tests/                 Vitest 核心逻辑测试
docs/superpowers/      设计规格和实施计划
```

## 验证记录

本机已验证：

- `npm test`
- `npm run typecheck`
- `npm run build`
- `cargo check`
- `cargo build --release`
- 启动 `src-tauri/target/release/idea-drop-box.exe` 后进程保持运行
