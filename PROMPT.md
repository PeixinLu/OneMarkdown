# OneMDEditor Working Agreements

- Use Vue 3 + TypeScript conventions; keep UI logic in components, data/domain in services/stores, and platform calls behind `src/services/platformAdapter.ts`.
- Use `src/services/noteService.ts` for markdown path transforms, web demo data, and debounced saves; avoid duplicating this logic elsewhere.
- Formatting/linting: follow ESLint + Prettier config in this repo. Run `npm run format` before commits; ensure editors format on save with the provided `.eslintrc.cjs` and `.prettierrc.json`.
- When adding platform features, expose them via the adapter and call Rust commands from there (no raw `invoke` in components).
- After each iteration/change set, append a brief summary to `对话历史.md` with timestamp and bullet points.
