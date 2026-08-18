import type { Plugin } from "./types";

export type PluginField = {
  key: string;
  label: string;
  type: "password" | "text";
  placeholder: string;
  optional?: boolean;
};

export type PluginDef = {
  id: string;
  name: string;
  description: string;
  category: string;
  docs: string;
  hint: string;
  fields: PluginField[];
};

export const PLUGIN_CATALOG: PluginDef[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Read threads and leave drafts in your inbox.",
    category: "Comms",
    docs: "https://developers.google.com/oauthplayground",
    hint: "Google OAuth access token with gmail.readonly and gmail.compose. Easiest source: OAuth 2.0 Playground.",
    fields: [{ key: "token", label: "Google access token", type: "password", placeholder: "ya29..." }],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Watch channels and draft replies where the team already works.",
    category: "Comms",
    docs: "https://api.slack.com/apps",
    hint: "Bot User OAuth Token from a Slack app. Scopes: channels:read, channels:history, chat:write.",
    fields: [{ key: "token", label: "Bot token", type: "password", placeholder: "xoxb-..." }],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Read your profile and draft posts in your voice.",
    category: "Sales",
    docs: "https://www.linkedin.com/developers/apps",
    hint: "OAuth access token with openid profile. People Search needs a partner app — drafts still work.",
    fields: [{ key: "token", label: "Access token", type: "password", placeholder: "AQX..." }],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Run SOQL and pull account or opportunity records.",
    category: "Sales",
    docs: "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth.htm",
    hint: "Instance URL plus a session / OAuth access token.",
    fields: [
      { key: "instance", label: "Instance URL", type: "text", placeholder: "https://yourorg.my.salesforce.com" },
      { key: "token", label: "Access token", type: "password", placeholder: "00D..." },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    description: "Open issues, read PRs, and file repro packs.",
    category: "Eng",
    docs: "https://github.com/settings/tokens",
    hint: "Classic or fine-grained PAT. repo scope for private repos.",
    fields: [{ key: "token", label: "Personal access token", type: "password", placeholder: "ghp_... or github_pat_..." }],
  },
  {
    id: "linear",
    name: "Linear",
    description: "Create and update issues from finished investigations.",
    category: "Eng",
    docs: "https://linear.app/settings/account/security",
    hint: "Personal API key from Linear settings.",
    fields: [{ key: "token", label: "API key", type: "password", placeholder: "lin_api_..." }],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search pages and leave structured notes.",
    category: "Docs",
    docs: "https://www.notion.so/my-integrations",
    hint: "Internal integration token. Share the target pages with the integration.",
    fields: [{ key: "token", label: "Integration token", type: "password", placeholder: "ntn_... or secret_..." }],
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Find open time and draft holds.",
    category: "Ops",
    docs: "https://developers.google.com/oauthplayground",
    hint: "Google OAuth access token with calendar.readonly and calendar.events.",
    fields: [{ key: "token", label: "Google access token", type: "password", placeholder: "ya29..." }],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Work the support queue and draft customer-safe replies.",
    category: "Support",
    docs: "https://support.zendesk.com/hc/en-us/articles/4408889192858",
    hint: "Subdomain, agent email, and an API token (not your password).",
    fields: [
      { key: "subdomain", label: "Subdomain", type: "text", placeholder: "yourcompany" },
      { key: "email", label: "Agent email", type: "text", placeholder: "you@company.com" },
      { key: "token", label: "API token", type: "password", placeholder: "zd token" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Look up invoices and flag billing anomalies.",
    category: "Finance",
    docs: "https://dashboard.stripe.com/apikeys",
    hint: "Secret key. Restricted keys work if they can read customers and invoices.",
    fields: [{ key: "token", label: "Secret key", type: "password", placeholder: "sk_live_... or sk_test_..." }],
  },
];

export function pluginDef(id: string): PluginDef | undefined {
  return PLUGIN_CATALOG.find((p) => p.id === id);
}

export function catalogAsPlugins(saved: Plugin[] = []): Plugin[] {
  return PLUGIN_CATALOG.map((d) => {
    const prev = saved.find((s) => s.id === d.id);
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      category: d.category,
      installed: Boolean(prev?.installed),
      authenticated: Boolean(prev?.authenticated),
    };
  });
}

export function fn(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = []
) {
  return {
    type: "function" as const,
    function: {
      name,
      description,
      parameters: { type: "object", properties, required },
    },
  };
}

export const PLUGIN_TOOLS: Record<string, ReturnType<typeof fn>[]> = {
  gmail: [
    fn("gmail_list_messages", "List Gmail messages. Optional Gmail search query.", {
      query: { type: "string", description: "Gmail search, e.g. newer_than:7d is:unread" },
      max: { type: "number", description: "Max messages, default 8" },
    }),
    fn("gmail_get_message", "Read one Gmail message by id.", { id: { type: "string" } }, ["id"]),
    fn(
      "gmail_create_draft",
      "Create a Gmail draft. Does not send unless confirm is true and the human approved.",
      {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        confirm: { type: "boolean", description: "true only after explicit approval to create in Gmail" },
      },
      ["to", "subject", "body"]
    ),
  ],
  slack: [
    fn("slack_list_channels", "List Slack channels the bot can see.", {}),
    fn("slack_history", "Read recent messages in a Slack channel.", {
      channel: { type: "string", description: "Channel ID (C...)" },
      limit: { type: "number" },
    }, ["channel"]),
    fn(
      "slack_post_message",
      "Post to Slack. Set confirm=true only after the human approved the exact text.",
      {
        channel: { type: "string" },
        text: { type: "string" },
        confirm: { type: "boolean" },
      },
      ["channel", "text"]
    ),
  ],
  linkedin: [
    fn("linkedin_get_me", "Get the authenticated LinkedIn member profile.", {}),
    fn(
      "linkedin_draft_post",
      "Save a LinkedIn post draft to the workspace. confirm=true tries to publish if the token allows it.",
      { text: { type: "string" }, confirm: { type: "boolean" } },
      ["text"]
    ),
  ],
  salesforce: [
    fn("salesforce_query", "Run a SOQL query.", { soql: { type: "string" } }, ["soql"]),
    fn("salesforce_describe", "List sObjects or describe one.", { sobject: { type: "string" } }),
  ],
  github: [
    fn("github_whoami", "Get the authenticated GitHub user.", {}),
    fn("github_list_repos", "List repositories for the authenticated user.", {
      per_page: { type: "number" },
    }),
    fn("github_list_issues", "List issues in a repo.", {
      repo: { type: "string", description: "owner/name" },
      state: { type: "string", enum: ["open", "closed", "all"] },
    }, ["repo"]),
    fn("github_list_prs", "List pull requests in a repo.", { repo: { type: "string" } }, ["repo"]),
    fn(
      "github_create_issue",
      "Create a GitHub issue. confirm=true only after approval.",
      {
        repo: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        confirm: { type: "boolean" },
      },
      ["repo", "title", "body"]
    ),
  ],
  linear: [
    fn("linear_viewer", "Get the authenticated Linear user and teams.", {}),
    fn("linear_list_issues", "List recent Linear issues.", {
      query: { type: "string" },
      limit: { type: "number" },
    }),
    fn(
      "linear_create_issue",
      "Create a Linear issue. confirm=true only after approval.",
      {
        title: { type: "string" },
        description: { type: "string" },
        team: { type: "string", description: "Team key or name" },
        confirm: { type: "boolean" },
      },
      ["title"]
    ),
  ],
  notion: [
    fn("notion_search", "Search Notion pages the integration can see.", { query: { type: "string" } }),
    fn("notion_get_page", "Get a Notion page by id.", { id: { type: "string" } }, ["id"]),
    fn(
      "notion_append",
      "Append a paragraph to a Notion page. confirm=true only after approval.",
      { id: { type: "string" }, text: { type: "string" }, confirm: { type: "boolean" } },
      ["id", "text"]
    ),
  ],
  calendar: [
    fn("calendar_list", "List calendars.", {}),
    fn("calendar_events", "List upcoming events.", {
      calendarId: { type: "string", description: "Default primary" },
      max: { type: "number" },
    }),
    fn(
      "calendar_create_event",
      "Create a calendar event. confirm=true only after approval.",
      {
        summary: { type: "string" },
        start: { type: "string", description: "ISO datetime" },
        end: { type: "string", description: "ISO datetime" },
        calendarId: { type: "string" },
        confirm: { type: "boolean" },
      },
      ["summary", "start", "end"]
    ),
  ],
  zendesk: [
    fn("zendesk_me", "Get the authenticated Zendesk agent.", {}),
    fn("zendesk_list_tickets", "List tickets.", { status: { type: "string" } }),
    fn("zendesk_get_ticket", "Get one ticket.", { id: { type: "number" } }, ["id"]),
    fn(
      "zendesk_create_ticket",
      "Create a ticket. confirm=true only after approval.",
      { subject: { type: "string" }, body: { type: "string" }, confirm: { type: "boolean" } },
      ["subject", "body"]
    ),
  ],
  stripe: [
    fn("stripe_balance", "Get Stripe account balance.", {}),
    fn("stripe_list_customers", "List recent customers.", { limit: { type: "number" } }),
    fn("stripe_list_invoices", "List invoices.", {
      status: { type: "string" },
      limit: { type: "number" },
    }),
  ],
};

export const PLUGIN_TOOL_LABELS: Record<string, string> = {
  gmail_list_messages: "Reading Gmail",
  gmail_get_message: "Opening a Gmail thread",
  gmail_create_draft: "Writing a Gmail draft",
  slack_list_channels: "Listing Slack channels",
  slack_history: "Reading Slack",
  slack_post_message: "Posting to Slack",
  linkedin_get_me: "Reading LinkedIn profile",
  linkedin_draft_post: "Drafting a LinkedIn post",
  salesforce_query: "Querying Salesforce",
  salesforce_describe: "Describing Salesforce",
  github_whoami: "Checking GitHub",
  github_list_repos: "Listing GitHub repos",
  github_list_issues: "Listing GitHub issues",
  github_list_prs: "Listing pull requests",
  github_create_issue: "Creating a GitHub issue",
  linear_viewer: "Checking Linear",
  linear_list_issues: "Listing Linear issues",
  linear_create_issue: "Creating a Linear issue",
  notion_search: "Searching Notion",
  notion_get_page: "Opening a Notion page",
  notion_append: "Writing to Notion",
  calendar_list: "Listing calendars",
  calendar_events: "Reading the calendar",
  calendar_create_event: "Creating a calendar event",
  zendesk_me: "Checking Zendesk",
  zendesk_list_tickets: "Listing Zendesk tickets",
  zendesk_get_ticket: "Opening a Zendesk ticket",
  zendesk_create_ticket: "Creating a Zendesk ticket",
  stripe_balance: "Checking Stripe balance",
  stripe_list_customers: "Listing Stripe customers",
  stripe_list_invoices: "Listing Stripe invoices",
};

export function isPluginTool(name: string): boolean {
  return Object.values(PLUGIN_TOOLS).some((list) => list.some((t) => t.function.name === name));
}

export function toolsForPlugins(plugins: Plugin[]): ReturnType<typeof fn>[] {
  const out: ReturnType<typeof fn>[] = [];
  for (const p of plugins) {
    if (p.installed && p.authenticated && PLUGIN_TOOLS[p.id]) out.push(...PLUGIN_TOOLS[p.id]);
  }
  return out;
}

const CREDS_KEY = "grok-bot-plugin-creds";

export function loadPluginCreds(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CREDS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function savePluginCreds(data: Record<string, Record<string, string>>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREDS_KEY, JSON.stringify(data));
}

export function setPluginCred(id: string, creds: Record<string, string> | null) {
  const all = loadPluginCreds();
  if (!creds || !Object.values(creds).some(Boolean)) delete all[id];
  else all[id] = creds;
  savePluginCreds(all);
  return all;
}
