"use client";

import { Plus, Search, Monitor, ChevronDown } from "lucide-react";
import type { Chat } from "@/lib/types";
import { previewText, timeAgo } from "@/lib/uid";

export function Sidebar({
  chats,
  activeId,
  pinnedIds,
  query,
  onQuery,
  onSelect,
  onNew,
  onAccount,
  onComputer,
  computerStatus,
  accountName,
  open,
  showHidden,
  onToggleHidden,
  onContext,
}: {
  chats: Chat[];
  activeId: string | null;
  pinnedIds: string[];
  query: string;
  onQuery: (v: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onAccount: () => void;
  onComputer: () => void;
  computerStatus: string;
  accountName: string;
  open?: boolean;
  showHidden?: boolean;
  onToggleHidden?: () => void;
  onContext?: (id: string, x: number, y: number) => void;
}) {
  const hiddenCount = chats.filter((c) => c.hidden).length;
  const visible = chats.filter((c) => (showHidden ? true : !c.hidden));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? visible.filter((c) => `${c.name} ${c.title} ${c.description}`.toLowerCase().includes(q))
    : visible;
  const pinned = filtered.filter((c) => pinnedIds.includes(c.id));
  const rest = filtered.filter((c) => !pinnedIds.includes(c.id));

  const render = (c: Chat) => {
    const last = [...c.messages].reverse().find((m) => m.role !== "system");
    return (
      <button
        key={c.id}
        className={`bot-row ${c.id === activeId ? "active" : ""}`}
        onClick={() => onSelect(c.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContext?.(c.id, e.clientX, e.clientY);
        }}
      >
        <div className="row">
          <div className="relative">
            <img src={c.avatar} alt="" className="avatar" />
            {c.working && <span className="pulse-dot absolute -bottom-0.5 -right-0.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="truncate text-[13.5px] font-medium">{c.name}</div>
              <div className="shrink-0 text-[10.5px] text-[var(--dim)]">{timeAgo(c.updatedAt)}</div>
            </div>
            <div className="truncate text-[12px] text-[var(--muted)]">
              {c.working ? "Working on the computer…" : last ? previewText(last.content) : c.title || "New teammate"}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <div className="flex items-center gap-2 px-1">
          <GrokMark />
          <div className="text-[14px] font-semibold tracking-[-0.03em]">Teammates</div>
        </div>
        <button className="icon-btn" title="New (⌘N)" data-testid="new-chat" onClick={onNew}>
          <Plus size={16} />
        </button>
      </div>
      <div className="px-3 pb-2">
        <div className="row rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-2.5">
          <Search size={14} className="text-[var(--dim)]" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search Bots"
            className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--dim)]"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-auto px-2 pb-3">
        {pinned.length > 0 && (
          <>
            <div className="px-2 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--dim)]">
              Pinned
            </div>
            {pinned.map(render)}
            {rest.length > 0 && (
              <div className="px-2 pb-1 pt-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--dim)]">
                Bots
              </div>
            )}
          </>
        )}
        {rest.map(render)}
        {!filtered.length && <div className="px-3 py-8 text-center text-[12px] text-[var(--dim)]">No Bots match</div>}
        {hiddenCount > 0 && (
          <button className="mt-2 w-full px-2 py-2 text-left text-[11.5px] text-[var(--dim)] hover:text-[var(--muted)]" onClick={onToggleHidden}>
            {showHidden ? "Hide hidden chats" : `Show hidden chats (${hiddenCount})`}
          </button>
        )}
      </div>
      <div className="border-t border-[var(--line)] p-2">
        <button className="bot-row" onClick={onComputer}>
          <div className="row">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-4)]">
              <Monitor size={15} />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-[13px] font-medium">Agent Computer</div>
              <div className="text-[11px] capitalize text-[var(--muted)]">Shared · {computerStatus}</div>
            </div>
          </div>
        </button>
        <button className="bot-row mt-0.5" onClick={onAccount}>
          <div className="row">
            <img src="/avatars/you.jpg" alt="" className="avatar" />
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[13px] font-medium">{accountName}</div>
              <div className="text-[11px] text-[var(--muted)]">Settings</div>
            </div>
            <ChevronDown size={14} className="text-[var(--dim)]" />
          </div>
        </button>
      </div>
    </aside>
  );
}

export function GrokMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.2 11.4 9 5.1l3.8 6.3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="9" cy="10.6" r="1.05" fill="currentColor" />
    </svg>
  );
}
