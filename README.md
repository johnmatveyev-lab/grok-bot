# Grok Bot (clone)

A local clone of [xAI Grok Bot](https://x.ai/bot): named AI teammates you message like coworkers. They share one computer — files, a browser, and a terminal — and only come back when something needs you.

- **Live:** [https://grok-bot-six.vercel.app](https://grok-bot-six.vercel.app)
- **Repo:** [https://github.com/johnmatveyev-lab/grok-bot](https://github.com/johnmatveyev-lab/grok-bot)

## Run

```bash
cd grok-bot
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Add API keys in **Settings → Models**, or set env vars:

| Provider | Env var | Default model |
| --- | --- | --- |
| xAI / Grok | `XAI_API_KEY` | `grok-4.6` |
| OpenAI | `OPENAI_API_KEY` | `gpt-5.6-terra` |
| NVIDIA NIM | `NVIDIA_API_KEY` | Nemotron 3 Super |
| Kimi (Moonshot) | `MOONSHOT_API_KEY` | `kimi-k3` |
| Qwen (DashScope) | `DASHSCOPE_API_KEY` | `qwen3.5-plus` |
| OpenRouter | `OPENROUTER_API_KEY` | `moonshotai/kimi-k3` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-5` |

Without a key, Bots still use the shared computer in local mode. Switch the live model from the header picker.

## What it includes

- Onboarding and suggested teammates (Grok, Atlas, Scout, Wren, Trace, Piper, Nova)
- Sidebar of Bots and group chats, pin / hide / delete
- Teammate-style chat with streaming, tool cards, approvals, reactions
- Shared Agent Computer: desktop, files, browser, terminal
- Routines, private skills, plugin marketplace (visual)
- Settings tabs: General, Plugins, Team Setup, Appearance, Updates
- Command palette (`⌘K` / `Ctrl+K`)

## Deploy

The app is a Next.js project and deploys on Vercel. Set any of the provider env vars above on the Vercel project if you want a default key in production. You can also paste keys in **Settings → Models** (kept in the browser so they survive serverless restarts). On Vercel the shared computer writes to `/tmp` (ephemeral per instance).

This is an unofficial clone. It is not the Cursor / xAI product.
