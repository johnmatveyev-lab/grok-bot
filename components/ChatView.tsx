"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check, Monitor, MoreHorizontal, PanelRight, StopCircle } from "lucide-react";
import type { Chat, Message } from "@/lib/types";
import { prettyToolName } from "@/lib/tools";
import { Markdown } from "./Markdown";

export function ChatView({
  chat,
  chats,
  onOpenPane,
  onOpenComputer,
  onMenu,
  onReact,
  onApprove,
  onStop,
  modelPicker,
}: {
  chat: Chat;
  chats: Chat[];
  onOpenPane: () => void;
  onOpenComputer: () => void;
  onMenu: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onApprove: (messageId: string, status: "approved" | "rejected") => void;
  onStop: () => void;
  modelPicker?: ReactNode;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.working]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] px-4">
        <button className="row min-w-0" onClick={onOpenPane} title="Conversation details (⇧⌘I)">
          <img src={chat.avatar} alt="" className="avatar" />
          <div className="min-w-0 text-left">
            <div className="truncate text-[14px] font-medium tracking-[-0.02em]">{chat.name}</div>
            <div className="truncate text-[11.5px] text-[var(--muted)]">
              {chat.kind === "group"
                ? `${chat.memberIds?.length || 0} Bots`
                : chat.working
                  ? "Working on the computer"
                  : chat.title}
            </div>
          </div>
        </button>
        <div className="row">
          {chat.working && (
            <button className="pill" onClick={onStop} title="Stop now">
              <StopCircle size={12} />
              Stop
            </button>
          )}
          {modelPicker}
          <button className="icon-btn" title="Agent Computer" onClick={onOpenComputer}>
            <Monitor size={16} />
          </button>
          <button className="icon-btn" title="Details" onClick={onOpenPane}>
            <PanelRight size={16} />
          </button>
          <button className="icon-btn" title="Bot actions" onClick={onMenu}>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-[760px]">
          {!chat.messages.length && <Empty chat={chat} />}
          {chat.messages.map((m) => (
            <MessageBlock
              key={m.id}
              message={m}
              chat={chat}
              chats={chats}
              onReact={onReact}
              onApprove={onApprove}
            />
          ))}
          {chat.working && !chat.messages.some((m) => m.role === "assistant" && !m.content && m.tools?.some((t) => t.status === "running")) && (
            <div className="msg assistant">
              <img src={chat.avatar} alt="" className="avatar sm mt-1" />
              <div className="text-[13px] text-[var(--muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="pulse-dot" />
                  Working
                </span>
              </div>
            </div>
          )}
          <div ref={end} />
        </div>
      </div>
    </div>
  );
}

function Empty({ chat }: { chat: Chat }) {
  return (
    <div className="mx-auto max-w-md pb-10 pt-10 text-center">
      <img src={chat.avatar} alt="" className="avatar xl mx-auto" />
      <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.03em]">{chat.name}</h2>
      <p className="mt-1 text-[13px] text-[var(--muted)]">{chat.title}</p>
      <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--muted)]">{chat.description}</p>
    </div>
  );
}

function MessageBlock({
  message,
  chat,
  chats,
  onReact,
  onApprove,
}: {
  message: Message;
  chat: Chat;
  chats: Chat[];
  onReact: (id: string, emoji: string) => void;
  onApprove: (id: string, status: "approved" | "rejected") => void;
}) {
  const author =
    message.role === "user"
      ? { name: "You", avatar: "/avatars/you.jpg" }
      : chats.find((c) => c.id === message.authorId) || chat;

  return (
    <div className={`msg ${message.role === "user" ? "user" : "assistant"}`}>
      <img src={author.avatar} alt="" className="avatar sm mt-1" />
      <div className="min-w-0 flex-1">
        <div className={`mb-1 text-[11px] ${message.role === "user" ? "text-right text-[var(--dim)]" : "text-[var(--dim)]"}`}>
          {author.name}
        </div>
        {!!message.tools?.length && (
          <div className="mb-2 space-y-1.5">
            {message.tools.map((t) => (
              <div key={t.id} className="tool-card">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="row text-[12.5px]">
                    {t.status === "running" ? <span className="pulse-dot" /> : <Check size={13} className="text-pulse" />}
                    <span>{prettyToolName(t.name)}</span>
                  </div>
                  <span className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--dim)]">{t.status}</span>
                </div>
                {t.args && Object.keys(t.args).length > 0 && (
                  <div className="border-t border-[var(--line)] px-3 py-2 font-mono text-[11px] text-[var(--muted)]">
                    {t.name === "write_file" && `→ ${String(t.args.path || "")}`}
                    {t.name === "read_file" && String(t.args.path || "")}
                    {t.name === "list_files" && String(t.args.path || "/workspace")}
                    {t.name === "run_command" && `$ ${String(t.args.command || "")}`}
                    {t.name === "browse_page" && String(t.args.url || "")}
                    {t.name === "message_bot" && `→ ${String(t.args.bot_name || "")}`}
                    {t.name === "create_routine" && String(t.args.name || "")}
                    {t.name === "save_memory" && String(t.args.note || "")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {message.content && (
          <div className="bubble">
            <Markdown text={message.content} />
          </div>
        )}
        {message.approval && (
          <div className="tool-card mt-2 p-3">
            <div className="text-[12px] font-medium">Approval needed</div>
            <div className="mt-1 text-[13px]">{message.approval.action}</div>
            <p className="mt-1 text-[12.5px] text-[var(--muted)]">{message.approval.detail}</p>
            {message.approval.status === "pending" ? (
              <div className="mt-3 flex gap-2">
                <button
                  className="h-8 rounded-full bg-[var(--text)] px-3 text-[12px] font-medium text-[var(--invert)]"
                  onClick={() => onApprove(message.id, "approved")}
                >
                  Approve
                </button>
                <button
                  className="h-8 rounded-full border border-[var(--line-2)] px-3 text-[12px]"
                  onClick={() => onApprove(message.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="mt-2 text-[12px] capitalize text-[var(--muted)]">{message.approval.status}</div>
            )}
          </div>
        )}
        {message.role === "assistant" && message.content && (
          <div className="mt-1 flex gap-1 opacity-0 transition hover:opacity-100">
            {["👍", "👀", "✅"].map((e) => (
              <button key={e} className="icon-btn h-7 w-7 text-[13px]" onClick={() => onReact(message.id, e)}>
                {e}
              </button>
            ))}
          </div>
        )}
        {!!message.reactions?.length && (
          <div className="mt-1 flex gap-1">
            {message.reactions.map((r) => (
              <span key={r.emoji} className="pill">
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FirstTasks({ chat, onPick }: { chat: Chat; onPick: (t: string) => void }) {
  const ideas = suggestions(chat);
  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-2">
      {ideas.map((t) => (
        <button key={t} className="suggest py-2.5 text-[12.5px] leading-snug text-[var(--muted)]" onClick={() => onPick(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

function suggestions(chat: Chat): string[] {
  if (chat.kind === "group") {
    return [
      "Agree who owns the next step and leave a one-page plan in /workspace/projects/ops.",
      "Research the question, draft the artifact, then review it in this thread. Don't publish.",
    ];
  }
  return [
    chat.title?.toLowerCase().includes("sales")
      ? "Build tonight's outbound review list and draft two emails in my voice. Do not send."
      : "Write a working agreement to /workspace/Welcome.md and tell me how you'll use the computer.",
    "Open https://x.ai/bot, summarize how Grok Bot is different, and save notes under /workspace/drafts.",
  ];
}


