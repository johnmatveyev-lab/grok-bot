export type Theme = "system" | "light" | "dark";

export type ChatKind = "bot" | "group";

export type ToolEvent = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "running" | "done" | "error";
};

export type Approval = {
  id: string;
  action: string;
  detail: string;
  status: "pending" | "approved" | "rejected";
};

export type Attachment = {
  name: string;
  text?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  authorId?: string;
  content: string;
  createdAt: number;
  tools?: ToolEvent[];
  approval?: Approval;
  attachments?: Attachment[];
  reactions?: { emoji: string; count: number }[];
};

export type Routine = {
  id: string;
  name: string;
  schedule: string;
  instructions: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: string;
  history: { at: number; ok: boolean; note: string }[];
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  private: boolean;
};

export type Plugin = {
  id: string;
  name: string;
  description: string;
  category: string;
  installed: boolean;
  authenticated: boolean;
};

export type Chat = {
  id: string;
  kind: ChatKind;
  name: string;
  title?: string;
  description?: string;
  avatar: string;
  memberIds?: string[];
  messages: Message[];
  memory: string[];
  routines: Routine[];
  enabledSkillIds: string[];
  notifications: boolean;
  unread: number;
  updatedAt: number;
  createdAt: number;
  working?: boolean;
  hidden?: boolean;
};

export type ComputerFile = {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  modified?: number;
};

export type ComputerState = {
  status: "idle" | "working" | "takeover";
  screenBotId?: string;
  app: "desktop" | "files" | "terminal" | "browser";
  cwd: string;
  url: string;
  pageTitle?: string;
  pageText?: string;
  lastCommand?: string;
  lastOutput?: string;
  termLines: { kind: "in" | "out" | "err"; text: string }[];
};

export type AppSettings = {
  theme: Theme;
  accountName: string;
  apiKeyConfigured: boolean;
  updateTrack: "stable" | "nightly";
  activeProvider: string;
  activeModel: string;
};

export type PersistShape = {
  version: 1;
  onboarded: boolean;
  settings: AppSettings;
  chats: Chat[];
  activeId: string | null;
  pinnedIds: string[];
  skills: Skill[];
  plugins: Plugin[];
};
