# Contributing

## Dev

```bash
npm install
cp .env.example .env.local   # optional keys
npm run dev
```

App: http://localhost:3000

## Checks

```bash
npx tsc --noEmit
```

Smoke the APIs:

- `GET /api/settings`
- `GET /api/computer?op=list&path=/workspace`
- `POST /api/computer` `{ "op": "exec", "command": "echo ok" }`
- `POST /api/plugins` with a bad GitHub token → 400
- `POST /api/chat` without a key → demo stream
- `POST /api/chat` with `provider: "nvidia"` and a key → `{ type: "model", provider: "nvidia" }`

## Rules

- Do not add tracking, phone-home, or hardcoded vendor branding.
- Do not log API keys or plugin tokens.
- Keep computer tools inside `/workspace`.
- External send/create/publish plugin tools stay behind `confirm=true`.
- New LLM providers go in `lib/providers.ts` plus the static env map in `lib/llm.ts` (Next.js inlines `process.env.NAME` at build time).
