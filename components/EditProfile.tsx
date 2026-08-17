"use client";

import { AVATARS } from "@/lib/defaults";
import type { Chat, Skill } from "@/lib/types";

export function EditProfile({
  open,
  chat,
  skills,
  onClose,
  onSave,
  onDuplicate,
  onDelete,
}: {
  open: boolean;
  chat: Chat | null;
  skills: Skill[];
  onClose: () => void;
  onSave: (patch: Partial<Chat>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  if (!open || !chat) return null;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal max-h-[680px] max-w-[520px] flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[var(--line)] px-5 py-4">
          <div className="text-[15px] font-semibold tracking-[-0.03em]">Edit profile</div>
          <div className="text-[12px] text-[var(--muted)]">Name, job, and rules that should stay true</div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-5">
          <div className="flex gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={`rounded-full ${chat.avatar === a ? "ring-2 ring-[var(--text)]" : "opacity-70"}`}
                onClick={() => onSave({ avatar: a })}
              >
                <img src={a} alt="" className="avatar" />
              </button>
            ))}
          </div>
          <input className="field" value={chat.name} onChange={(e) => onSave({ name: e.target.value })} />
          {chat.kind === "bot" && (
            <input className="field" value={chat.title || ""} onChange={(e) => onSave({ title: e.target.value })} />
          )}
          <textarea
            className="field min-h-[120px]"
            value={chat.description || ""}
            onChange={(e) => onSave({ description: e.target.value })}
          />
          <label className="row text-[13px] text-[var(--muted)]">
            <input
              type="checkbox"
              checked={chat.notifications}
              onChange={(e) => onSave({ notifications: e.target.checked })}
            />
            Notifications
          </label>
          {chat.kind === "bot" && (
            <div>
              <div className="mb-2 text-[12px] font-medium text-[var(--muted)]">Enabled skills</div>
              {skills.map((s) => {
                const on = chat.enabledSkillIds.includes(s.id);
                return (
                  <label key={s.id} className="row mb-1.5 text-[13px]">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        onSave({
                          enabledSkillIds: on
                            ? chat.enabledSkillIds.filter((id) => id !== s.id)
                            : [...chat.enabledSkillIds, s.id],
                        })
                      }
                    />
                    {s.name}
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
          <div className="flex gap-3">
            {chat.kind === "bot" && (
              <button className="text-[12.5px] text-[var(--muted)]" onClick={onDuplicate}>
                Duplicate
              </button>
            )}
            <button className="text-[12.5px] text-danger" onClick={onDelete}>
              Delete
            </button>
          </div>
          <button className="h-8 rounded-full bg-[var(--text)] px-4 text-[12.5px] font-medium text-[var(--invert)]" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
