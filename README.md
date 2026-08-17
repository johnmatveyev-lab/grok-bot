# Grok Bot (clone)

A local clone of [xAI Grok Bot](https://x.ai/bot): named AI teammates you message like coworkers. They share one computer — files, a browser, and a terminal — and only come back when something needs you.

## Run

```bash
cd grok-bot
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Paste an xAI API key in **Settings → General** (or set `XAI_API_KEY`) to use **grok-4.6**. Without a key, Bots still use the shared computer in local mode.

## What it includes

- Onboarding and suggested teammates (Grok, Atlas, Scout, Wren, Trace, Piper, Nova)
- Sidebar of Bots and group chats, pin / hide / delete
- Teammate-style chat with streaming, tool cards, approvals, reactions
- Shared Agent Computer: desktop, files, browser, terminal
- Routines, private skills, plugin marketplace (visual)
- Settings tabs: General, Plugins, Team Setup, Appearance, Updates
- Command palette (`⌘K` / `Ctrl+K`)

## Deploy

The app is a Next.js project and deploys on Vercel. Set `XAI_API_KEY` in the project environment if you want Grok 4.6 in production. On Vercel the shared computer writes to `/tmp` (ephemeral per instance).

This is an unofficial clone. It is not the Cursor / xAI product.
