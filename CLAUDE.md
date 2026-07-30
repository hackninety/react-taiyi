# CLAUDE.md

Claude Code 在本仓库工作时遵循的项目约定。

## 沟通与提交

- 始终用**中文**与用户对话；新增代码注释、文档也用中文。
- Git commit 信息用**中文**，简洁描述改动即可。
- 每完成一轮处理后**自动 commit 并 push**（类似存档），无需等用户确认。
- 本文件（`CLAUDE.md`）的修改**直接提交推送 `main`**，不必开 PR。

## 关联仓库（可同步修改）

- 当前 GitHub 账号（hackninety）下有一组 `*-ts-lib` 术数库（如 qmdj-ts-lib、lrdq-ts-lib、zslj-ts-lib、shj-ts-lib、tbss-ts-lib、nhx-ts-lib），部分项目以依赖方式引用它们。
- 本仓库以 GitHub 依赖引用 `yhys-core`（github:hackninety/react-yhys，皇极经世历）。
- 如改动需要动到这些关联库，可直接在对应仓库修改、commit（中文）并 push，然后回本仓库更新依赖引用。

## 项目速览

- 太乙神数排盘：React 18 + TypeScript + Vite；算法参照 kentang2017/kintaiyi（MIT）。
- 常用命令：`npm test`（vitest）、`npm run build`（tsc + vite）、`npm run mcp`（内建 MCP server）。
- 关键路径：导出 `src/taiyi/export.ts`（TOON/JSON/Markdown）、AI 提示词 `src/lib/prompt.ts`、判读规则速查 `src/lib/knowledge.ts`、导出卡 UI `src/components/ExportCard.tsx`。
