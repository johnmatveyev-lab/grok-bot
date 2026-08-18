"use client";

import { useMemo, useState } from "react";
import { pluginDef } from "@/lib/plugins";
import type { Plugin } from "@/lib/types";

export function PluginsPanel({
  plugins,
  onInstall,
  onConnect,
  onDisconnect,
}: {
  plugins: Plugin[];
  onInstall: (id: string, installed: boolean) => void;
  onConnect: (id: string, creds: Record<string, string>) => Promise<{ ok: boolean; label?: string; error?: string }>;
  onDisconnect: (id: string) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [view, setView] = useState<"Marketplace" | "Yours">("Marketplace");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      plugins.filter((p) => `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q.toLowerCase())),
    [plugins, q]
  );
  const installed = plugins.filter((p) => p.installed);
  const active = plugins.find((p) => p.id === openId) || null;
  const def = active ? pluginDef(active.id) : undefined;

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.03em]">Plugins</h2>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            Add a connector, then authenticate with a real token. After it shows Connected, @ it in chat and the Bot
            can use it.
          </p>
        </div>
        <div className="flex rounded-full bg-[var(--bg-4)] p-0.5 text-[12px]">
          {(["Marketplace", "Yours"] as const).map((v) => (
            <button
              key={v}
              className={`rounded-full px-3 py-1 ${view === v ? "bg-[var(--bg-3)]" : "text-[var(--muted)]"}`}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <input className="field mt-4" placeholder="Search plugins" value={q} onChange={(e) => setQ(e.target.value)} />

      {view === "Marketplace" && (
        <div className="mt-4 grid gap-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] p-3">
              <div>
                <div className="text-[13.5px] font-medium">{p.name}</div>
                <div className="text-[12px] text-[var(--muted)]">
                  {p.category} · {p.description}
                </div>
              </div>
              {p.installed ? (
                <button className="h-8 rounded-full border border-[var(--line-2)] px-3 text-[12px]" onClick={() => setOpenId(p.id)}>
                  {p.authenticated ? "Manage" : "Connect"}
                </button>
              ) : (
                <button
                  className="h-8 rounded-full bg-[var(--text)] px-3 text-[12px] font-medium text-[var(--invert)]"
                  onClick={() => {
                    onInstall(p.id, true);
                    setOpenId(p.id);
                    setView("Yours");
                  }}
                >
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {view === "Yours" && (
        <div className="mt-4 space-y-2">
          {!installed.length && <p className="text-[12px] text-[var(--dim)]">Nothing installed yet. Add one from Marketplace.</p>}
          {installed.map((p) => (
            <button key={p.id} className={`bot-row ${openId === p.id ? "active" : ""}`} onClick={() => setOpenId(p.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px]">{p.name}</div>
                  <div className="text-[11px] text-[var(--muted)]">{p.authenticated ? "Connected" : "Needs authentication"}</div>
                </div>
                <span className={`pill ${p.authenticated ? "live" : ""}`}>{p.authenticated ? "Live" : "Off"}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && def && (
        <ConnectForm
          plugin={active}
          def={def}
          onClose={() => setOpenId(null)}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onUninstall={() => {
            onInstall(active.id, false);
            setOpenId(null);
          }}
        />
      )}
    </section>
  );
}

function ConnectForm({
  plugin,
  def,
  onClose,
  onConnect,
  onDisconnect,
  onUninstall,
}: {
  plugin: Plugin;
  def: NonNullable<ReturnType<typeof pluginDef>>;
  onClose: () => void;
  onConnect: (id: string, creds: Record<string, string>) => Promise<{ ok: boolean; label?: string; error?: string }>;
  onDisconnect: (id: string) => Promise<void>;
  onUninstall: () => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    setNote("");
    const result = await onConnect(plugin.id, vals);
    setBusy(false);
    if (result.ok) setNote(result.label ? `Connected as ${result.label}` : "Connected");
    else setErr(result.error || "Could not authenticate");
  };

  return (
    <div className="mt-5 rounded-2xl border border-[var(--line)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-medium">{def.name}</div>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">{def.hint}</p>
        </div>
        <button className="text-[12px] text-[var(--dim)]" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {def.fields.map((f) => (
          <label key={f.key} className="block">
            <div className="mb-1 text-[11px] text-[var(--muted)]">{f.label}</div>
            <input
              className="field"
              type={f.type}
              placeholder={plugin.authenticated ? "••••••••  (leave blank to keep)" : f.placeholder}
              value={vals[f.key] || ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      {err && <div className="mt-2 text-[12px] text-danger">{err}</div>}
      {note && <div className="mt-2 text-[12px] text-pulse">{note}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="h-8 rounded-full bg-[var(--text)] px-3 text-[12px] font-medium text-[var(--invert)] disabled:opacity-40"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "Testing…" : plugin.authenticated ? "Re-test / update" : "Test and connect"}
        </button>
        {plugin.authenticated && (
          <button
            className="h-8 rounded-full border border-[var(--line-2)] px-3 text-[12px]"
            onClick={() => void onDisconnect(plugin.id)}
          >
            Disconnect
          </button>
        )}
        <button className="h-8 rounded-full px-3 text-[12px] text-danger" onClick={onUninstall}>
          Uninstall
        </button>
        <a className="ml-auto self-center text-[11.5px] text-link" href={def.docs} target="_blank" rel="noreferrer">
          Get credentials
        </a>
      </div>
    </div>
  );
}
