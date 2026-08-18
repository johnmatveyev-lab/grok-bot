"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PROVIDERS, providerById, type ProviderId, type ProviderStatus } from "@/lib/providers";

export function ModelPicker({
  provider,
  model,
  status,
  onChange,
  onAddKeys,
}: {
  provider: string;
  model: string;
  status: Record<ProviderId, ProviderStatus>;
  onChange: (provider: ProviderId, model: string) => void;
  onAddKeys: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const def = providerById(provider);
  const connected = PROVIDERS.filter((p) => status[p.id]?.configured);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="row h-8 max-w-[220px] rounded-full border border-[var(--line)] px-2.5 text-[12px] text-[var(--muted)] hover:border-[var(--line-2)] hover:text-[var(--text)]"
        onClick={() => setOpen((v) => !v)}
        title="Model"
      >
        <span className="truncate">
          {def.name.split(" ")[0]} · {shortModel(model)}
        </span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[280px] overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--bg-3)] shadow-pane">
          <div className="px-3 pb-1 pt-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--dim)]">
            Providers
          </div>
          {connected.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-[var(--muted)]">No keys yet — local mode.</div>
          )}
          {connected.map((p) => {
            const models = uniqueModels(p.models.map((m) => m.id), status[p.id]?.model);
            return (
              <div key={p.id} className="border-t border-[var(--line)] py-1">
                <div className="px-3 py-1 text-[11px] font-medium text-[var(--muted)]">{p.name}</div>
                {models.map((id) => (
                  <button
                    key={id}
                    className={`bot-row rounded-none ${provider === p.id && model === id ? "active" : ""}`}
                    onClick={() => {
                      onChange(p.id, id);
                      setOpen(false);
                    }}
                  >
                    <div className="truncate text-[12.5px]">{labelFor(p, id)}</div>
                  </button>
                ))}
              </div>
            );
          })}
          <button
            className="bot-row rounded-none border-t border-[var(--line)]"
            onClick={() => {
              setOpen(false);
              onAddKeys();
            }}
          >
            <div className="text-[12.5px]">Add or edit API keys…</div>
          </button>
        </div>
      )}
    </div>
  );
}

function shortModel(id: string): string {
  const tail = id.split("/").pop() || id;
  return tail.length > 22 ? `${tail.slice(0, 20)}…` : tail;
}

function labelFor(p: (typeof PROVIDERS)[number], id: string): string {
  return p.models.find((m) => m.id === id)?.label || id;
}

function uniqueModels(listed: string[], extra?: string): string[] {
  const out = [...listed];
  if (extra && !out.includes(extra)) out.unshift(extra);
  return out;
}
