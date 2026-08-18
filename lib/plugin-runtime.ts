import { writeFileSafe } from "./workspace";

type Creds = Record<string, string>;
type Args = Record<string, unknown>;

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 800) };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : text.slice(0, 400) || res.statusText;
    throw new Error(`${res.status} ${msg}`.slice(0, 600));
  }
  return data;
}

function str(args: Args, key: string, fallback = ""): string {
  return String(args[key] ?? fallback);
}

function num(args: Args, key: string, fallback: number): number {
  const n = Number(args[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function confirmed(args: Args): boolean {
  return args.confirm === true || args.confirm === "true";
}

async function draft(path: string, content: string): Promise<string> {
  const written = await writeFileSafe(path, content);
  return `Draft saved at ${written}. Call again with confirm=true after the human approves to perform the live action.`;
}

function b64url(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export async function testPlugin(id: string, creds: Creds): Promise<{ ok: boolean; label?: string; error?: string }> {
  try {
    if (id === "gmail") {
      const data = (await gmail(creds, "/gmail/v1/users/me/profile")) as { emailAddress?: string };
      return { ok: true, label: data.emailAddress || "Gmail" };
    }
    if (id === "slack") {
      const data = (await slack(creds, "auth.test")) as { ok?: boolean; user?: string; team?: string; error?: string };
      if (!data.ok) throw new Error(data.error || "auth.test failed");
      return { ok: true, label: `${data.user} · ${data.team}` };
    }
    if (id === "linkedin") {
      const data = (await li(creds, "/v2/userinfo")) as { name?: string; email?: string };
      return { ok: true, label: data.name || data.email || "LinkedIn" };
    }
    if (id === "salesforce") {
      const inst = normInstance(creds.instance);
      const data = (await sf(creds, "/services/data/v60.0/")) as { label?: string }[];
      return { ok: true, label: inst.replace(/^https?:\/\//, "") + (Array.isArray(data) ? ` · API ${data.length} versions` : "") };
    }
    if (id === "github") {
      const data = (await gh(creds, "/user")) as { login?: string };
      return { ok: true, label: data.login || "GitHub" };
    }
    if (id === "linear") {
      const data = (await linear(creds, "{ viewer { name email } }")) as { data?: { viewer?: { name?: string; email?: string } } };
      const v = data.data?.viewer;
      return { ok: true, label: v?.name || v?.email || "Linear" };
    }
    if (id === "notion") {
      const data = (await notion(creds, "/v1/users/me")) as { name?: string; bot?: { owner?: { user?: { name?: string } } } };
      return { ok: true, label: data.name || data.bot?.owner?.user?.name || "Notion" };
    }
    if (id === "calendar") {
      const data = (await cal(creds, "/calendar/v3/users/me/calendarList?maxResults=1")) as { items?: { summary?: string }[] };
      return { ok: true, label: data.items?.[0]?.summary || "Google Calendar" };
    }
    if (id === "zendesk") {
      const data = (await zd(creds, "/api/v2/users/me.json")) as { user?: { name?: string; email?: string } };
      return { ok: true, label: data.user?.email || data.user?.name || "Zendesk" };
    }
    if (id === "stripe") {
      const data = (await stripe(creds, "/v1/balance")) as { available?: { currency?: string }[] };
      return { ok: true, label: `Stripe · ${data.available?.[0]?.currency || "connected"}` };
    }
    throw new Error("Unknown plugin");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
  }
}

export async function runPluginTool(name: string, args: Args, credsByPlugin: Record<string, Creds>): Promise<string> {
  const plugin = name.split("_")[0];
  const creds = credsByPlugin[plugin];
  if (!creds) throw new Error(`${plugin} is not connected. Open Settings → Plugins and authenticate.`);

  if (name === "gmail_list_messages") {
    const q = encodeURIComponent(str(args, "query"));
    const max = num(args, "max", 8);
    const list = (await gmail(creds, `/gmail/v1/users/me/messages?maxResults=${max}${q ? `&q=${q}` : ""}`)) as {
      messages?: { id: string }[];
    };
    const ids = (list.messages || []).slice(0, max);
    const rows = [];
    for (const m of ids) {
      const full = (await gmail(creds, `/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`)) as {
        snippet?: string;
        payload?: { headers?: { name: string; value: string }[] };
      };
      const h = Object.fromEntries((full.payload?.headers || []).map((x) => [x.name, x.value]));
      rows.push(`- ${m.id} | ${h.From || "?"} | ${h.Subject || "(no subject)"} | ${full.snippet || ""}`);
    }
    return rows.join("\n") || "No messages.";
  }
  if (name === "gmail_get_message") {
    const full = (await gmail(creds, `/gmail/v1/users/me/messages/${str(args, "id")}?format=full`)) as {
      snippet?: string;
      payload?: { headers?: { name: string; value: string }[]; body?: { data?: string }; parts?: { mimeType?: string; body?: { data?: string } }[] };
    };
    const h = Object.fromEntries((full.payload?.headers || []).map((x) => [x.name, x.value]));
    let body = full.payload?.body?.data ? b64url(full.payload.body.data) : "";
    if (!body && full.payload?.parts) {
      const part = full.payload.parts.find((p) => p.mimeType === "text/plain") || full.payload.parts[0];
      if (part?.body?.data) body = b64url(part.body.data);
    }
    return `From: ${h.From}\nDate: ${h.Date}\nSubject: ${h.Subject}\n\n${(body || full.snippet || "").slice(0, 6000)}`;
  }
  if (name === "gmail_create_draft") {
    const raw = [`To: ${str(args, "to")}`, `Subject: ${str(args, "subject")}`, "", str(args, "body")].join("\n");
    if (!confirmed(args)) {
      return draft(`/workspace/drafts/gmail-${Date.now()}.txt`, raw);
    }
    const encoded = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const created = (await gmail(creds, "/gmail/v1/users/me/drafts", { method: "POST", body: JSON.stringify({ message: { raw: encoded } }) })) as { id?: string };
    return `Gmail draft created (${created.id || "ok"}). It was not sent.`;
  }

  if (name === "slack_list_channels") {
    const data = (await slack(creds, "conversations.list", { limit: "50", types: "public_channel,private_channel" })) as {
      ok?: boolean;
      error?: string;
      channels?: { id: string; name: string; is_member?: boolean }[];
    };
    if (!data.ok) throw new Error(data.error || "conversations.list failed");
    return (data.channels || []).map((c) => `- ${c.id} #${c.name}${c.is_member ? " (member)" : ""}`).join("\n") || "No channels.";
  }
  if (name === "slack_history") {
    const data = (await slack(creds, "conversations.history", { channel: str(args, "channel"), limit: String(num(args, "limit", 12)) })) as {
      ok?: boolean;
      error?: string;
      messages?: { user?: string; text?: string; ts?: string }[];
    };
    if (!data.ok) throw new Error(data.error || "history failed");
    return (data.messages || []).map((m) => `- ${m.ts} ${m.user || "bot"}: ${(m.text || "").slice(0, 300)}`).join("\n") || "Empty channel.";
  }
  if (name === "slack_post_message") {
    if (!confirmed(args)) return draft(`/workspace/drafts/slack-${Date.now()}.md`, `channel: ${str(args, "channel")}\n\n${str(args, "text")}`);
    const data = (await slack(creds, "chat.postMessage", { channel: str(args, "channel"), text: str(args, "text") })) as { ok?: boolean; error?: string; ts?: string };
    if (!data.ok) throw new Error(data.error || "post failed");
    return `Posted to ${str(args, "channel")} (${data.ts}).`;
  }

  if (name === "linkedin_get_me") {
    return JSON.stringify(await li(creds, "/v2/userinfo"), null, 2);
  }
  if (name === "linkedin_draft_post") {
    const text = str(args, "text");
    if (!confirmed(args)) return draft(`/workspace/drafts/linkedin-${Date.now()}.md`, text);
    return draft(`/workspace/drafts/linkedin-ready-${Date.now()}.md`, `${text}\n\n(LinkedIn publish APIs need a partner app. Draft is ready to paste.)`);
  }

  if (name === "salesforce_query") {
    const soql = encodeURIComponent(str(args, "soql"));
    const data = await sf(creds, `/services/data/v60.0/query?q=${soql}`);
    return JSON.stringify(data, null, 2).slice(0, 8000);
  }
  if (name === "salesforce_describe") {
    const sobject = str(args, "sobject");
    const path = sobject
      ? `/services/data/v60.0/sobjects/${encodeURIComponent(sobject)}/describe`
      : "/services/data/v60.0/sobjects";
    const data = await sf(creds, path);
    return JSON.stringify(data, null, 2).slice(0, 8000);
  }

  if (name === "github_whoami") {
    const u = (await gh(creds, "/user")) as { login?: string; name?: string; html_url?: string };
    return `${u.login} (${u.name || "—"}) ${u.html_url || ""}`;
  }
  if (name === "github_list_repos") {
    const data = (await gh(creds, `/user/repos?per_page=${num(args, "per_page", 20)}&sort=updated`)) as { full_name: string; private?: boolean; html_url: string }[];
    return data.map((r) => `- ${r.full_name}${r.private ? " (private)" : ""} ${r.html_url}`).join("\n");
  }
  if (name === "github_list_issues") {
    const repo = str(args, "repo");
    const state = str(args, "state", "open");
    const data = (await gh(creds, `/repos/${repo}/issues?state=${state}&per_page=20`)) as { number: number; title: string; html_url: string; pull_request?: unknown }[];
    return data.filter((i) => !i.pull_request).map((i) => `- #${i.number} ${i.title} ${i.html_url}`).join("\n") || "No issues.";
  }
  if (name === "github_list_prs") {
    const repo = str(args, "repo");
    const data = (await gh(creds, `/repos/${repo}/pulls?state=open&per_page=20`)) as { number: number; title: string; html_url: string; user?: { login?: string } }[];
    return data.map((p) => `- #${p.number} ${p.title} (@${p.user?.login}) ${p.html_url}`).join("\n") || "No open PRs.";
  }
  if (name === "github_create_issue") {
    const repo = str(args, "repo");
    const title = str(args, "title");
    const body = str(args, "body");
    if (!confirmed(args)) return draft(`/workspace/drafts/github-issue-${Date.now()}.md`, `# ${title}\n\nrepo: ${repo}\n\n${body}`);
    const created = (await gh(creds, `/repos/${repo}/issues`, { method: "POST", body: JSON.stringify({ title, body }) })) as { html_url?: string; number?: number };
    return `Opened #${created.number} ${created.html_url}`;
  }

  if (name === "linear_viewer") {
    const data = await linear(creds, "{ viewer { name email } teams { nodes { id key name } } }");
    return JSON.stringify(data, null, 2);
  }
  if (name === "linear_list_issues") {
    const q = str(args, "query");
    const limit = num(args, "limit", 15);
    const gql = q
      ? `{ issueSearch(query: ${JSON.stringify(q)}, first: ${limit}) { nodes { identifier title state { name } url } } }`
      : `{ issues(first: ${limit}) { nodes { identifier title state { name } url } } }`;
    const data = await linear(creds, gql);
    return JSON.stringify(data, null, 2).slice(0, 8000);
  }
  if (name === "linear_create_issue") {
    const title = str(args, "title");
    const description = str(args, "description");
    if (!confirmed(args)) return draft(`/workspace/drafts/linear-${Date.now()}.md`, `# ${title}\n\n${description}`);
    const teams = (await linear(creds, "{ teams { nodes { id key name } } }")) as { data?: { teams?: { nodes?: { id: string; key: string; name: string }[] } } };
    const want = str(args, "team").toLowerCase();
    const team =
      (teams.data?.teams?.nodes || []).find((t) => t.key.toLowerCase() === want || t.name.toLowerCase() === want) ||
      teams.data?.teams?.nodes?.[0];
    if (!team) throw new Error("No Linear team found");
    const created = await linear(
      creds,
      `mutation { issueCreate(input: { teamId: "${team.id}", title: ${JSON.stringify(title)}, description: ${JSON.stringify(description)} }) { success issue { identifier url } } }`
    );
    return JSON.stringify(created, null, 2);
  }

  if (name === "notion_search") {
    const data = await notion(creds, "/v1/search", { method: "POST", body: JSON.stringify({ query: str(args, "query"), page_size: 12 }) });
    return JSON.stringify(summarizeNotion(data), null, 2);
  }
  if (name === "notion_get_page") {
    const data = await notion(creds, `/v1/pages/${str(args, "id")}`);
    return JSON.stringify(data, null, 2).slice(0, 8000);
  }
  if (name === "notion_append") {
    if (!confirmed(args)) return draft(`/workspace/drafts/notion-${Date.now()}.md`, `page: ${str(args, "id")}\n\n${str(args, "text")}`);
    await notion(creds, `/v1/blocks/${str(args, "id")}/children`, {
      method: "PATCH",
      body: JSON.stringify({
        children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: str(args, "text").slice(0, 1900) } }] } }],
      }),
    });
    return `Appended to Notion page ${str(args, "id")}.`;
  }

  if (name === "calendar_list") {
    const data = (await cal(creds, "/calendar/v3/users/me/calendarList")) as { items?: { id: string; summary?: string }[] };
    return (data.items || []).map((c) => `- ${c.id} · ${c.summary}`).join("\n");
  }
  if (name === "calendar_events") {
    const calId = encodeURIComponent(str(args, "calendarId", "primary"));
    const now = new Date().toISOString();
    const data = (await cal(creds, `/calendar/v3/calendars/${calId}/events?maxResults=${num(args, "max", 12)}&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(now)}`)) as {
      items?: { summary?: string; start?: { dateTime?: string; date?: string }; htmlLink?: string }[];
    };
    return (data.items || []).map((e) => `- ${e.start?.dateTime || e.start?.date} · ${e.summary} ${e.htmlLink || ""}`).join("\n") || "No upcoming events.";
  }
  if (name === "calendar_create_event") {
    const payload = {
      summary: str(args, "summary"),
      start: { dateTime: str(args, "start") },
      end: { dateTime: str(args, "end") },
    };
    if (!confirmed(args)) return draft(`/workspace/drafts/calendar-${Date.now()}.json`, JSON.stringify(payload, null, 2));
    const calId = encodeURIComponent(str(args, "calendarId", "primary"));
    const created = (await cal(creds, `/calendar/v3/calendars/${calId}/events`, { method: "POST", body: JSON.stringify(payload) })) as { htmlLink?: string };
    return `Event created ${created.htmlLink || ""}`.trim();
  }

  if (name === "zendesk_me") {
    return JSON.stringify(await zd(creds, "/api/v2/users/me.json"), null, 2);
  }
  if (name === "zendesk_list_tickets") {
    const status = str(args, "status");
    const path = status ? `/api/v2/search.json?query=${encodeURIComponent("type:ticket status:" + status)}` : "/api/v2/tickets.json?sort_by=updated_at&sort_order=desc";
    const data = await zd(creds, path);
    return JSON.stringify(data, null, 2).slice(0, 8000);
  }
  if (name === "zendesk_get_ticket") {
    return JSON.stringify(await zd(creds, `/api/v2/tickets/${num(args, "id", 0)}.json`), null, 2).slice(0, 8000);
  }
  if (name === "zendesk_create_ticket") {
    if (!confirmed(args)) return draft(`/workspace/drafts/zendesk-${Date.now()}.md`, `# ${str(args, "subject")}\n\n${str(args, "body")}`);
    const created = await zd(creds, "/api/v2/tickets.json", {
      method: "POST",
      body: JSON.stringify({ ticket: { subject: str(args, "subject"), comment: { body: str(args, "body") } } }),
    });
    return JSON.stringify(created, null, 2).slice(0, 4000);
  }

  if (name === "stripe_balance") {
    return JSON.stringify(await stripe(creds, "/v1/balance"), null, 2);
  }
  if (name === "stripe_list_customers") {
    return JSON.stringify(await stripe(creds, `/v1/customers?limit=${num(args, "limit", 10)}`), null, 2).slice(0, 8000);
  }
  if (name === "stripe_list_invoices") {
    const status = str(args, "status");
    const q = status ? `&status=${encodeURIComponent(status)}` : "";
    return JSON.stringify(await stripe(creds, `/v1/invoices?limit=${num(args, "limit", 10)}${q}`), null, 2).slice(0, 8000);
  }

  throw new Error(`Unknown plugin tool ${name}`);
}

async function gmail(creds: Creds, path: string, init: RequestInit = {}) {
  return readJson(
    await fetch(`https://gmail.googleapis.com${path}`, {
      ...init,
      headers: { authorization: `Bearer ${creds.token}`, "content-type": "application/json", ...init.headers },
    })
  );
}

async function slack(creds: Creds, method: string, form: Record<string, string> = {}) {
  const body = new URLSearchParams(form);
  return readJson(
    await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { authorization: `Bearer ${creds.token}`, "content-type": "application/x-www-form-urlencoded" },
      body,
    })
  );
}

async function li(creds: Creds, path: string) {
  return readJson(await fetch(`https://api.linkedin.com${path}`, { headers: { authorization: `Bearer ${creds.token}` } }));
}

function normInstance(raw: string): string {
  const s = (raw || "").trim().replace(/\/+$/, "");
  if (!s) throw new Error("Salesforce instance URL is required");
  return s.startsWith("http") ? s : `https://${s}`;
}

async function sf(creds: Creds, path: string) {
  return readJson(
    await fetch(`${normInstance(creds.instance)}${path}`, {
      headers: { authorization: `Bearer ${creds.token}`, "content-type": "application/json" },
    })
  );
}

async function gh(creds: Creds, path: string, init: RequestInit = {}) {
  return readJson(
    await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${creds.token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "grok-bot-clone",
        "content-type": "application/json",
        ...init.headers,
      },
    })
  );
}

async function linear(creds: Creds, query: string) {
  return readJson(
    await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { authorization: creds.token, "content-type": "application/json" },
      body: JSON.stringify({ query }),
    })
  );
}

async function notion(creds: Creds, path: string, init: RequestInit = {}) {
  return readJson(
    await fetch(`https://api.notion.com${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${creds.token}`,
        "notion-version": "2022-06-28",
        "content-type": "application/json",
        ...init.headers,
      },
    })
  );
}

async function cal(creds: Creds, path: string, init: RequestInit = {}) {
  return readJson(
    await fetch(`https://www.googleapis.com${path}`, {
      ...init,
      headers: { authorization: `Bearer ${creds.token}`, "content-type": "application/json", ...init.headers },
    })
  );
}

async function zd(creds: Creds, path: string, init: RequestInit = {}) {
  const sub = (creds.subdomain || "").replace(/\.zendesk\.com.*$/, "").replace(/^https?:\/\//, "");
  const basic = Buffer.from(`${creds.email}/token:${creds.token}`).toString("base64");
  return readJson(
    await fetch(`https://${sub}.zendesk.com${path}`, {
      ...init,
      headers: { authorization: `Basic ${basic}`, "content-type": "application/json", ...init.headers },
    })
  );
}

async function stripe(creds: Creds, path: string) {
  return readJson(
    await fetch(`https://api.stripe.com${path}`, {
      headers: { authorization: `Bearer ${creds.token}` },
    })
  );
}

function summarizeNotion(data: unknown): unknown {
  const results = (data as { results?: { id: string; object?: string; url?: string; properties?: Record<string, { title?: { plain_text?: string }[] }> }[] }).results || [];
  return results.map((r) => {
    const title =
      Object.values(r.properties || {})
        .flatMap((p) => p.title || [])
        .map((t) => t.plain_text)
        .join("") || r.id;
    return { id: r.id, title, url: r.url };
  });
}
