"use client";

import { useEffect, useMemo, useState } from "react";
import type { Chat } from "@/lib/types";

export function CommandPalette({
  open,
  chats,
  onClose,
  onSelect,
  onAction,
}: {
  open: boolean;
  chats: Chat[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onAction: (action: "new" | "settings" | "computer") => void;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const actions = [
      { id: "act-new", kind: "action" as const, label: "Create new agent", hint: "⌘N" },
      { id: "act-settings", kind: "action" as const, label: "Open settings", hint: "⌘," },
      { id: "act-computer", kind: "action" as const, label: "Agent Computer", hint: "" },
    ].filter((a) => !query || a.label.toLowerCase().includes(query));

    const bots = chats
      .filter((c) => !c.hidden)
      .filter((c) => !query || `${c.name} ${c.title} ${c.messages.map((m) => m.content).join(" ")}`.toLowerCase().includes(query))
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        kind: "chat" as const,
        label: c.name,
        hint: c.title || (c.kind === "group" ? "Group" : "Bot"),
        avatar: c.avatar,
      }));

    return [...actions, ...bots];
  }, [q, chats]);

  if (!open) return null;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="w-[min(560px,100%)] overflow-hidden rounded-[16px] border border-[var(--line-2)] bg-[var(--bg-3)] shadow-pane" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="h-12 w-full border-b border-[var(--line)] bg-transparent px-4 text-[14px] outline-none"
          placeholder="Switch Bots, find work, open settings…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && items[0]) {
              if (items[0].kind === "chat") onSelect(items[0].id);
              else if (items[0].id === "act-new") onAction("new");
              else if (items[0].id === "act-settings") onAction("settings");
              else onAction("computer");
            }
          }}
        />
        <div className="max-h-[360px] overflow-auto p-1.5">
          {items.map((it) => (
            <button
              key={it.id}
              className="bot-row"
              onClick={() => {
                if (it.kind === "chat") onSelect(it.id);
                else if (it.id === "act-new") onAction("new");
                else if (it.id === "act-settings") onAction("settings");
                else onAction("computer");
              }}
            >
              <div className="flex items-center justify-between">
                <span className="row text-[13px]">
                  {"avatar" in it && it.avatar ? <img src={it.avatar} alt="" className="avatar sm" /> : null}
                  {it.label}
                </span>
                <span className="text-[11px] text-[var(--dim)]">{it.hint}</span>
              </div>
            </button>
          ))}
          {!items.length && <div className="px-3 py-6 text-center text-[12px] text-[var(--dim)]">Nothing found</div>}
        </div>
      </div>
    </div>
  );
}
