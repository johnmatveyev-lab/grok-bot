"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, AtSign, Paperclip, Slash } from "lucide-react";
import type { Chat, Plugin, Skill } from "@/lib/types";

export function Composer({
  chats,
  skills,
  plugins,
  disabled,
  onSend,
}: {
  chats: Chat[];
  skills: Skill[];
  plugins?: Plugin[];
  disabled?: boolean;
  onSend: (text: string, extras?: { attachments?: { name: string; text?: string }[] }) => void;
}) {
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<"@" | "/" | null>(null);
  const ref = awaitableRef();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [text, ref]);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
    setMenu(null);
  };

  const onChange = (v: string) => {
    setText(v);
    if (v.endsWith("@")) setMenu("@");
    else if (v.endsWith("/")) setMenu("/");
    else setMenu(null);
  };

  const attach = async (file: File) => {
    const textBody = file.type.startsWith("text") || file.name.match(/\.(md|txt|json|csv)$/i) ? await file.text() : "";
    onSend(`Attached ${file.name}${textBody ? ` — please use this file:\n\n${textBody.slice(0, 8000)}` : ""}`, {
      attachments: [{ name: file.name, text: textBody.slice(0, 8000) }],
    });
  };

  return (
    <div className="relative">
      {menu === "@" && (
        <Suggest
          items={[
            ...chats.filter((c) => c.kind === "bot").map((c) => ({ id: c.id, label: c.name, hint: c.title || "Bot" })),
            ...(plugins || [])
              .filter((p) => p.installed && p.authenticated)
              .map((p) => ({ id: `plug-${p.id}`, label: p.name, hint: "Plugin" })),
          ]}
          onPick={(label) => {
            setText((t) => t.replace(/@$/, `@${label} `));
            setMenu(null);
          }}
        />
      )}
      {menu === "/" && (
        <Suggest
          items={skills.map((s) => ({ id: s.id, label: s.name, hint: s.description }))}
          onPick={(label) => {
            setText((t) => t.replace(/\/$/, `/${label}: `));
            setMenu(null);
          }}
        />
      )}
      <div className="composer">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          disabled={disabled}
          placeholder="Message like a teammate. @ a Bot or plugin, / a skill."
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <div className="flex items-center gap-0.5">
            <label className="icon-btn cursor-pointer" title="Attach">
              <Paperclip size={15} />
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void attach(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <button className="icon-btn" title="Mention" onClick={() => setMenu(menu === "@" ? null : "@")}>
              <AtSign size={15} />
            </button>
            <button className="icon-btn" title="Skill" onClick={() => setMenu(menu === "/" ? null : "/")}>
              <Slash size={15} />
            </button>
          </div>
          <button className="send" disabled={disabled || !text.trim()} onClick={send} aria-label="Send">
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Suggest({
  items,
  onPick,
}: {
  items: { id: string; label: string; hint: string }[];
  onPick: (label: string) => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-[calc(100%+8px)] overflow-hidden rounded-16px rounded-[16px] border border-[var(--line)] bg-[var(--bg-3)] shadow-pane">
      {items.slice(0, 6).map((it) => (
        <button
          key={it.id}
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-4)]"
          onClick={() => onPick(it.label)}
        >
          <span className="text-[13px]">{it.label}</span>
          <span className="truncate text-[11px] text-[var(--muted)]">{it.hint}</span>
        </button>
      ))}
      {!items.length && <div className="px-3 py-3 text-[12px] text-[var(--dim)]">Nothing here yet</div>}
    </div>
  );
}

function awaitableRef() {
  return useRef<HTMLTextAreaElement>(null);
}
