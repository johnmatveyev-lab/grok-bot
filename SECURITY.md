# Security

## What this software does

This is a **personal / team workstation app**. Teammates can list, read, and write files under `/workspace`, run shell commands there, and fetch public web pages. Treat a public deployment as a remote shell unless you lock it down.

## Do not commit secrets

Never commit:

- API keys (`NVIDIA_API_KEY`, `OPENAI_API_KEY`, plugin tokens, etc.)
- `.env` / `.env.local`
- `.data/settings.json` (can contain keys on a local disk)
- Browser `localStorage` dumps

Keys belong in environment variables, or in the Settings UI (browser localStorage + an httpOnly cookie). They are sent to `/api/chat` so serverless hosts can call the model.

## Public deploys

Set `APP_SECRET` on the host. Mutating routes (`POST /api/chat`, `/api/computer`, `/api/plugins`, `/api/settings`) then require:

- Header `x-app-secret: <value>`, or
- Cookie `app-secret=<value>`

If `APP_SECRET` is unset (default for local `npm run dev`), those routes are open. That is intentional for a laptop install. It is **not** safe on a public URL.

On Vercel the workspace is `/tmp` and does not survive instance recycles. That is not a security boundary.

## What the APIs never return

- Raw API keys
- Plugin tokens
- Settings file contents

`GET /api/settings` only reports whether a provider is configured and (after v1.1) the source (`env` / `saved` / `cookie`).

## Reporting

Open a GitHub issue without pasting secrets. Rotate any key that may have leaked.
