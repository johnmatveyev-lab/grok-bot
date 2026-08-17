import type { Chat, Plugin, Skill } from "./types";

export const AVATARS = [
  "/avatars/grok.jpg",
  "/avatars/atlas.jpg",
  "/avatars/scout.jpg",
  "/avatars/wren.jpg",
  "/avatars/trace.jpg",
  "/avatars/piper.jpg",
  "/avatars/nova.jpg",
];

export type BotTemplate = {
  key: string;
  name: string;
  title: string;
  description: string;
  avatar: string;
  firstTask: string;
};

export const BOT_TEMPLATES: BotTemplate[] = [
  {
    key: "grok",
    name: "Grok",
    title: "General teammate",
    description:
      "Help with anything across files, the browser, and the terminal. Be maximally truthful, useful, and a little witty. Keep durable notes in /workspace. Never send, purchase, publish, or change production systems without approval.",
    avatar: "/avatars/grok.jpg",
    firstTask:
      "Write a short working agreement to /workspace/Welcome.md covering how you'll use the shared computer, when you'll ask for approval, and the format you prefer for updates.",
  },
  {
    key: "atlas",
    name: "Atlas",
    title: "Sales outbound",
    description:
      "Generate pipeline overnight. Research accounts, score contacts with intent, draft email and LinkedIn in the user's voice, and leave a review list to approve. Never send outreach without approval.",
    avatar: "/avatars/atlas.jpg",
    firstTask:
      "Create /workspace/projects/outbound/review-list.md with a template for tonight's review queue: account, contact, intent score, draft status, and approval checkbox.",
  },
  {
    key: "scout",
    name: "Scout",
    title: "Talent scout",
    description:
      "Source candidates, read public profiles, write calibrated scorecards, and draft outreach. Never contact a candidate or change an ATS record without approval.",
    avatar: "/avatars/scout.jpg",
    firstTask:
      "Create /workspace/projects/talent/scorecard.md with a hiring scorecard template: role, must-haves, evidence, risks, and a hire / maybe / no recommendation.",
  },
  {
    key: "wren",
    name: "Wren",
    title: "Expense manager",
    description:
      "Collect receipts, categorize spend, flag outliers, and prepare reimbursement packs. Never submit, approve, or pay anything without an explicit go-ahead.",
    avatar: "/avatars/wren.jpg",
    firstTask:
      "Create /workspace/projects/expenses/ledger.md with columns for date, merchant, category, amount, receipt, and status.",
  },
  {
    key: "trace",
    name: "Trace",
    title: "Bug reproduction",
    description:
      "Reproduce issues in staging or the product UI, capture steps and evidence, and file a repro pack. Never change production settings. Ask before filing externally.",
    avatar: "/avatars/trace.jpg",
    firstTask:
      "Create /workspace/projects/bugs/repro-pack.md with sections for summary, environment, steps, expected vs actual, evidence, and severity.",
  },
  {
    key: "piper",
    name: "Piper",
    title: "Product performance",
    description:
      "Investigate product-performance questions using dashboards and files. Preserve links, separate evidence from hypotheses, and lead with the highest-impact issue. Never change production settings.",
    avatar: "/avatars/piper.jpg",
    firstTask:
      "Create /workspace/projects/performance/investigation.md with a template: question, evidence, hypotheses, highest-impact issue, and next measurement.",
  },
  {
    key: "nova",
    name: "Nova",
    title: "Chief of staff",
    description:
      "Coordinate the other Bots, keep priorities straight, and only pull the human in for judgment calls. Assign owners, track blockers, and summarize the day. Do not do specialist work when another Bot owns it.",
    avatar: "/avatars/nova.jpg",
    firstTask:
      "Create /workspace/projects/ops/daily-brief.md with a daily brief template: priorities, owners, blockers, and decisions needed.",
  },
];

export const DEFAULT_SKILLS: Skill[] = [
  {
    id: "skill-weekly-health",
    name: "Weekly account health",
    description: "Pull usage and support signals, flag churn or expansion, return a linked watch list.",
    instructions:
      "When used: produce a watch list of accounts. Cite every claim. Separate evidence from inference. Never contact a customer. End with Decisions needed.",
    private: true,
  },
  {
    id: "skill-standup",
    name: "Daily standup digest",
    description: "Compress yesterday's work into five bullets plus blockers.",
    instructions:
      "Five bullets, source links inline, blockers last, no fluff. If data is missing, say so instead of inventing progress.",
    private: true,
  },
  {
    id: "skill-repro",
    name: "Repro pack",
    description: "Turn a bug report into a structured reproduction pack.",
    instructions:
      "Fill summary, environment, numbered steps, expected vs actual, evidence, severity. Do not change production. Ask before filing a ticket externally.",
    private: true,
  },
];

export const DEFAULT_PLUGINS: Plugin[] = [
  { id: "gmail", name: "Gmail", description: "Read threads and leave drafts in your inbox.", category: "Comms", installed: false, authenticated: false },
  { id: "slack", name: "Slack", description: "Watch channels and draft replies where the team already works.", category: "Comms", installed: false, authenticated: false },
  { id: "linkedin", name: "LinkedIn", description: "Research people and draft connection notes in your voice.", category: "Sales", installed: false, authenticated: false },
  { id: "salesforce", name: "Salesforce", description: "Keep CRM hygiene clean and pull pipeline context.", category: "Sales", installed: false, authenticated: false },
  { id: "github", name: "GitHub", description: "Open issues, read PRs, and file repro packs.", category: "Eng", installed: false, authenticated: false },
  { id: "linear", name: "Linear", description: "Create and update issues from finished investigations.", category: "Eng", installed: false, authenticated: false },
  { id: "notion", name: "Notion", description: "Read wikis and leave structured notes in the right page.", category: "Docs", installed: false, authenticated: false },
  { id: "calendar", name: "Calendar", description: "Find open time and draft holds — never send invites alone.", category: "Ops", installed: false, authenticated: false },
  { id: "zendesk", name: "Zendesk", description: "Work the support queue and draft customer-safe replies.", category: "Support", installed: false, authenticated: false },
  { id: "stripe", name: "Stripe", description: "Look up invoices and flag billing anomalies.", category: "Finance", installed: false, authenticated: false },
];

export function templateToChat(t: BotTemplate): Chat {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    kind: "bot",
    name: t.name,
    title: t.title,
    description: t.description,
    avatar: t.avatar,
    messages: [],
    memory: [],
    routines: [],
    enabledSkillIds: [],
    notifications: true,
    unread: 0,
    updatedAt: now,
    createdAt: now,
  };
}

export function blankBot(): Chat {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    kind: "bot",
    name: "New Agent",
    title: "Untitled role",
    description: "Give this Bot one primary job and the rules that should stay true across tasks.",
    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    messages: [],
    memory: [],
    routines: [],
    enabledSkillIds: [],
    notifications: true,
    unread: 0,
    updatedAt: now,
    createdAt: now,
  };
}
