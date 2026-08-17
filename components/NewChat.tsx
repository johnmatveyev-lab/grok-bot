"use client";

import { useState } from "react";
import { AVATARS, BOT_TEMPLATES } from "@/lib/defaults";
import type { Chat } from "@/lib/types";

export function NewChat({
  open,
  chats,
  onClose,
  onCreateBot,
  onCreateFromTemplate,
  onCreateGroup,
}: {
  open: boolean;
  chats: Chat[];
  onClose: () => void;
  onCreateBot: (draft: { name: string; title: string; description: string; avatar: string }) => void;
  onCreateFromTemplate: (key: string) => void;
  onCreateGroup: (memberIds: string[], name: string) => void;
}) {
  const [tab, setTab] = useState<"agent" | "group">("agent");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [members, setMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  if (!open) return null;
  const bots = chats.filter((c) => c.kind === "bot" && !c.hidden);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal max-h-[720px] max-w-[640px] flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.03em]">New chat</div>
            <div className="text-[12px] text-[var(--muted)]">Create a Bot or put teammates in a group</div>
          </div>
          <div className="flex rounded-full bg-[var(--bg-4)] p-0.5 text-[12px]">
            {(["agent", "group"] as const).map((t) => (
              <button
                key={t}
                className={`rounded-full px-3 py-1 capitalize ${tab === t ? "bg-[var(--bg-3)]" : "text-[var(--muted)]"}`}
                onClick={() => setTab(t)}
              >
                {t === "agent" ? "Create new agent" : "Group"}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          {tab === "agent" && (
            <>
              <div className="mb-4 text-[12px] font-medium text-[var(--muted)]">Suggested teammates</div>
              <div className="mb-6 grid grid-cols-2 gap-2">
                {BOT_TEMPLATES.filter((t) => !chats.some((c) => c.name === t.name)).map((t) => (
                  <button key={t.key} className="suggest py-2.5" onClick={() => onCreateFromTemplate(t.key)}>
                    <div className="row">
                      <img src={t.avatar} alt="" className="avatar sm" />
                      <div className="text-left">
                        <div className="text-[13px] font-medium">{t.name}</div>
                        <div className="text-[11px] text-[var(--muted)]">{t.title}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mb-3 text-[12px] font-medium text-[var(--muted)]">Create your own</div>
              <div className="mb-3 flex gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    className={`rounded-full ${avatar === a ? "ring-2 ring-[var(--text)]" : "opacity-70"}`}
                    onClick={() => setAvatar(a)}
                  >
                    <img src={a} alt="" className="avatar" />
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="field" placeholder="One primary job" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea
                  className="field min-h-[96px]"
                  placeholder="How it should work — and what requires approval"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className="h-9 rounded-full bg-[var(--text)] px-4 text-[13px] font-medium text-[var(--invert)] disabled:opacity-40"
                  disabled={!name.trim()}
                  onClick={() =>
                    onCreateBot({
                      name: name.trim(),
                      title: title.trim() || "Teammate",
                      description: description.trim(),
                      avatar,
                    })
                  }
                >
                  Create Bot
                </button>
              </div>
            </>
          )}
          {tab === "group" && (
            <>
              <input
                className="field mb-4"
                placeholder="Group name — Website Launch"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <p className="mb-3 text-[12.5px] text-[var(--muted)]">Select two to six Bots. They can pass work in this thread.</p>
              <div className="space-y-1">
                {bots.map((b) => {
                  const on = members.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      className={`bot-row ${on ? "active" : ""}`}
                      onClick={() =>
                        setMembers((m) => {
                          if (on) return m.filter((id) => id !== b.id);
                          if (m.length >= 6) return m;
                          return [...m, b.id];
                        })
                      }
                    >
                      <div className="row">
                        <img src={b.avatar} alt="" className="avatar sm" />
                        <div className="text-left">
                          <div className="text-[13px]">{b.name}</div>
                          <div className="text-[11px] text-[var(--muted)]">{b.title}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className="h-9 rounded-full bg-[var(--text)] px-4 text-[13px] font-medium text-[var(--invert)] disabled:opacity-40"
                  disabled={members.length < 2}
                  onClick={() =>
                    onCreateGroup(
                      members,
                      groupName.trim() || bots.filter((b) => members.includes(b.id)).map((b) => b.name).join(" · ")
                    )
                  }
                >
                  Open group
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
