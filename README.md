# Open teammate bots

Named AI teammates you message like coworkers. They share **one computer** — files, a browser, and a terminal — and only come back when something needs you.

Bring your own model keys. NVIDIA NIM, OpenAI, Anthropic, Kimi, Qwen, OpenRouter, and any OpenAI-compatible endpoint.

**Independent open-source software.** Not affiliated with, endorsed by, or a product of xAI, SpaceX, Grok, or Oracle OpenGrok.

- **Live demo:** [https://grok-bot-six.vercel.app](https://grok-bot-six.vercel.app) *(ephemeral computer on Vercel; do not treat it as a secure host)*
- **Source:** [https://github.com/johnmatveyev-lab/grok-bot](https://github.com/johnmatveyev-lab/grok-bot)
- **License:** [MIT](./LICENSE)
- **2.0 rename plan:** [docs/V2.md](./docs/V2.md)

The GitHub repository is still named `grok-bot` until version 2.0. The product chrome in this tree already drops clone/xAI branding. A new public name (recommended: **Matebox**) ships in 2.0.

---

## What it is

A Next.js app for a **roster of named bots**:

1. You pick or create teammates (sales, bugs, ops, or a custom job).
2. You chat in a sidebar, the way you would with people.
3. When work needs a filesystem, a shell, or a web page, the bot uses the **shared computer** at `/workspace`.
4. Dangerous external actions (send mail, file a ticket, charge a card) stay behind **approval**. Plugins can draft to disk first.

Without an API key, bots still operate the computer in a local **demo** loop (list files, write notes, open URLs). With a key, they stream from your chosen model and call the same tools.

---

## What it is not

- Not the commercial Grok Bot product.
- Not a hosted multi-tenant SaaS. It is a **single-owner workstation** you run.
- Not a hardened sandbox. `run_command` is a real shell inside `/workspace`. See [SECURITY.md](./SECURITY.md).

---

## Quick start

```bash
git clone https://github.com/johnmatveyev-lab/grok-bot.git
cd grok-bot
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Pick teammates on onboarding (or skip with your own names).
2. Open **Settings → Models**.
3. Paste a key (NVIDIA is `nvapi-…`) → **Save** → **Use this** → **Test**.
4. Chat. The header picker shows the live provider.

Or set env vars and skip the UI:

```bash
NVIDIA_API_KEY=nvapi-... npm run dev
```

---

## How it works

```
Browser (chat UI, localStorage keys)
    │  POST /api/chat  { messages, provider, providerKeys, plugins }
    ▼
Next.js route  ── resolveLlm() ──► NVIDIA / OpenAI / Anthropic / …
    │                │
    │                ├─ env (NVIDIA_API_KEY, …)  [survives Vercel]
    │                ├─ httpOnly cookie          [survives instances for that browser]
    │                └─ JSON body providerKeys   [from Settings → Save]
    │
    ├─ stream tokens → SSE { type: "text" }
    └─ tool calls
           ├─ list_files / read_file / write_file / run_command / browse_page
           ├─ save_memory, create_routine, create_skill, request_approval
           └─ plugin tools (Gmail, Slack, GitHub, …) if you connected them
                    ▼
           /workspace  (local disk, or /tmp on Vercel)
```

Chat is **SSE** (`text/event-stream`):

| Event | Meaning |
| --- | --- |
| `model` | Live provider + model id (NVIDIA is working when you see this) |
| `status` | `working` |
| `text` | Token delta |
| `tool` | Tool start/finish |
| `computer` | Files / terminal / browser UI |
| `error` | Model or tool failure (including bad API keys) |
| `done` | Stream finished |

If there is **no key**, you get the demo loop instead of `model`.

### NVIDIA NIM

- Base URL: `https://integrate.api.nvidia.com/v1`
- Default model: `nvidia/nemotron-3-super-120b-a12b`
- Env: `NVIDIA_API_KEY`
- Chat completions require a real key (403 `Authorization failed` otherwise). The public `/v1/models` list does **not** prove a key works. **Settings → Test** runs a tiny completion.

On Vercel, set `NVIDIA_API_KEY` on the project and **redeploy**. Keys saved only in `/tmp` are lost when the instance recycles. This app also stores keys in an httpOnly cookie and in the browser so chat still works.

### Other providers

| Provider | Env var | Default model |
| --- | --- | --- |
| NVIDIA NIM | `NVIDIA_API_KEY` | Nemotron 3 Super |
| OpenAI | `OPENAI_API_KEY` | `gpt-5.6-terra` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-5` |
| Kimi (Moonshot) | `MOONSHOT_API_KEY` | `kimi-k3` |
| Qwen (DashScope) | `DASHSCOPE_API_KEY` | `qwen3.5-plus` |
| OpenRouter | `OPENROUTER_API_KEY` | `moonshotai/kimi-k3` |
| xAI (optional) | `XAI_API_KEY` | `grok-4.6` |

xAI is one optional backend, listed last on purpose.

---

## Features

- Onboarding and starter teammates (Atlas, Scout, Wren, Trace, Piper, Nova, plus a starter named Grok that 2.0 will rename)
- Sidebar: pin, hide, delete, search, command palette (`⌘K` / `Ctrl+K`)
- Streaming chat, tool cards, approvals, reactions, handoff between bots
- Shared computer: desktop, files, browser, terminal
- Routines and private skills
- Plugin marketplace with **real** connect/test against Gmail, Slack, LinkedIn, Salesforce, GitHub, Linear, Notion, Calendar, Zendesk, Stripe
- Settings: General, Models, Plugins, Team Setup, Appearance, Updates

---

## Shared computer

Root: `/workspace` (jailed). Layout:

```
/workspace
  README.md
  drafts/
  inbox/
  projects/
```

| API | What |
| --- | --- |
| `GET /api/computer?op=list&path=/workspace` | Directory listing |
| `GET /api/computer?op=read&path=…` | Read a text file |
| `POST /api/computer` `{ "op": "write", "path", "content" }` | Write |
| `POST /api/computer` `{ "op": "exec", "command" }` | Shell in `/workspace` (20s, blocked `rm -f /`, `sudo`, …) |
| `POST /api/computer` `{ "op": "browse", "url" }` | Fetch http(s), strip tags |

On Vercel this disk is **ephemeral**. For durable files, run on a laptop or a VPS with a volume.

---

## Plugins

Settings → Plugins → paste credentials → **Add**. The server **tests** the token against the real API. Bad GitHub PATs return 401. Connected plugins add tools to chat (`github_whoami`, `gmail_list_messages`, …). Send/create actions require `confirm=true` after `request_approval`.

Credentials stay in browser `localStorage` and, if you save them, in `.data/settings.json` on disk (not on Vercel across instances).

---

## Deploy

### Vercel (current demo)

The repo is linked to Vercel project `grok-bot` → [https://grok-bot-six.vercel.app](https://grok-bot-six.vercel.app).

1. Set `NVIDIA_API_KEY` (and any others) in Vercel → Environment Variables for Production.
2. Set `APP_SECRET` if the URL is public.
3. Redeploy. Env vars that Next.js inlines need a new build.

Hobby `/tmp` is not a team fileserver.

### Self-host

```bash
npm install
npm run build
NVIDIA_API_KEY=… APP_SECRET=… npm start
```

Put a reverse proxy in front. Persist the project directory so `/workspace` and `.data/` survive.

---

## Configuration

See `.env.example`.

| Variable | Role |
| --- | --- |
| `NVIDIA_API_KEY` | NVIDIA NIM |
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic Messages API |
| `MOONSHOT_API_KEY` | Kimi |
| `DASHSCOPE_API_KEY` | Qwen |
| `OPENROUTER_API_KEY` | OpenRouter |
| `XAI_API_KEY` | Optional xAI |
| `APP_SECRET` | If set, `POST` APIs require `x-app-secret` or cookie `app-secret` |

---

## Security

Read [SECURITY.md](./SECURITY.md). Short version: this app can run shell commands. Do not expose it on the internet without `APP_SECRET` (or stronger auth in 2.0). Never commit keys.

---

## Version 2.0

Phase-by-phase rename, new GitHub repo, and domain choice: **[docs/V2.md](./docs/V2.md)**.

Skip `opengrok.bot` / `.co` / `.app`. OpenGrok is Oracle’s code-search project; Grok is xAI’s mark. Preferred direction: **Matebox** (`matebox.app` had no DNS when last checked — confirm at a registrar).

---

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md)

```bash
npx tsc --noEmit
```

---

## License

[MIT](./LICENSE)
