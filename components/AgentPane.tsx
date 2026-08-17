"use client";

import { Bell, Play, Pause, Trash2, X, Settings as Gear } from "lucide-react";
import type { Chat, Routine } from "@/lib/types";

export function AgentPane({
  chat,
  chats,
  open,
  onClose,
  onComputer,
  onEdit,
  onToggleRoutine,
  onRunRoutine,
  onDeleteRoutine,
}: {
  chat: Chat;
  chats: Chat[];
  open?: boolean;
  onClose: () => void;
  onComputer: () => void;
  onEdit: () => void;
  onToggleRoutine: (id: string) => void;
  onRunRoutine: (id: string) => void;
  onDeleteRoutine: (id: string) => void;
}) {
  const members = (chat.memberIds || []).map((id) => chats.find((c) => c.id === id)).filter(Boolean) as Chat[];

  return (
    <aside className={`agent-pane ${open ? "open" : ""}`}>
      <div className="flex h-14 items-center justify-between border-b border-[var(--line)] px-3">
        <div className="text-[13px] font-medium">Conversation</div>
        <div className="row">
          <button className="icon-btn" title="Edit profile" onClick={onEdit}>
            <Gear size={15} />
          </button>
          <button className="icon-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <button className="desktop w-full" style={{ backgroundImage: "url(/computer/wallpaper.jpg)" }} onClick={onComputer}>
          <div className="flex h-[168px] items-end justify-between p-3">
            <div>
              <div className="text-left text-[11px] text-white/70">Agent Computer</div>
              <div className="text-left text-[13px] font-medium text-white">Click to open full screen</div>
            </div>
            <span className={`pill ${chat.working ? "live" : ""}`}>{chat.working ? "Working" : "Idle"}</span>
          </div>
        </button>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-medium">Routines</div>
            <div className="text-[11px] text-[var(--dim)]">{chat.routines.length}/50</div>
          </div>
          {!chat.routines.length && (
            <p className="text-[12.5px] leading-relaxed text-[var(--muted)]">
              Ask {chat.name} to run something on a schedule. Routines keep working after you close this window.
            </p>
          )}
          <div className="space-y-2">
            {chat.routines.map((r) => (
              <RoutineRow
                key={r.id}
                routine={r}
                onToggle={() => onToggleRoutine(r.id)}
                onRun={() => onRunRoutine(r.id)}
                onDelete={() => onDeleteRoutine(r.id)}
              />
            ))}
          </div>
        </section>

        {chat.kind === "group" && (
          <section className="mt-6">
            <div className="mb-2 text-[12px] font-medium">Members</div>
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="row rounded-xl px-1 py-1.5">
                  <img src={m.avatar} alt="" className="avatar sm" />
                  <div>
                    <div className="text-[13px]">{m.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">{m.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-2 text-[12px] font-medium">Channels</div>
          <p className="text-[12.5px] text-[var(--muted)]">
            Connect Slack or iMessage from Settings → Plugins to reach this Bot from another surface.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--line)] p-3">
          <div className="row text-[12.5px] text-[var(--muted)]">
            <Bell size={14} />
            Notifications {chat.notifications ? "on" : "off"}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--dim)]">{chat.description}</p>
        </section>
      </div>
    </aside>
  );
}

function RoutineRow({
  routine,
  onToggle,
  onRun,
  onDelete,
}: {
  routine: Routine;
  onToggle: () => void;
  onRun: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-3)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium">{routine.name}</div>
          <div className="text-[11.5px] text-[var(--muted)]">{routine.schedule}</div>
        </div>
        <div className="row">
          <button className="icon-btn" title="Test run" onClick={onRun}>
            <Play size={13} />
          </button>
          <button className="icon-btn" title={routine.enabled ? "Pause" : "Enable"} onClick={onToggle}>
            {routine.enabled ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button className="icon-btn" title="Delete" onClick={onDelete}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[12px] text-[var(--muted)]">{routine.instructions}</p>
    </div>
  );
}
