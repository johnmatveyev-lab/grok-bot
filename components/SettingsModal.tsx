"use client";

import { useEffect, useState } from "react";
import type { AppSettings, Plugin, Skill, Theme } from "@/lib/types";
import { PROVIDERS, type ProviderId, type ProviderStatus } from "@/lib/providers";
import { PluginsPanel } from "./PluginsPanel";

const TABS = ["General", "Models", "Plugins", "Team Setup", "Appearance", "Updates"] as const;
type Tab = (typeof TABS)[number];

export function SettingsModal({
  open,
  settings,
  plugins,
  skills,
  onClose,
  onSettings,
  onSkills,
  providerStatus,
  onSaveProvider,
  onUseProvider,
  onInstallPlugin,
  onConnectPlugin,
  onDisconnectPlugin,
  initialTab,
}: {
  open: boolean;
  settings: AppSettings;
  plugins: Plugin[];
  skills: Skill[];
  onClose: () => void;
  onSettings: (p: Partial<AppSettings>) => void;
  onSkills: (s: Skill[]) => void;
  providerStatus: Record<ProviderId, ProviderStatus>;
  onSaveProvider: (id: ProviderId, data: { key?: string; model?: string; baseUrl?: string; clear?: boolean }) => Promise<void>;
  onUseProvider: (id: ProviderId, model: string) => void;
  onInstallPlugin: (id: string, installed: boolean) => void;
  onConnectPlugin: (id: string, creds: Record<string, string>) => Promise<{ ok: boolean; label?: string; error?: string }>;
  onDisconnectPlugin: (id: string) => Promise<void>;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab || "General");

  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <aside className="w-[200px] shrink-0 border-r border-[var(--line)] bg-[var(--bg-2)] p-3">
          <div className="px-2 pb-3 pt-1 text-[12px] font-medium text-[var(--muted)]">Settings</div>
          {TABS.map((t) => (
            <button key={t} className={`bot-row ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              <div className="text-[13px]">{t}</div>
            </button>
          ))}
        </aside>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-6">
          {tab === "General" && (
            <section>
              <h2 className="text-[18px] font-semibold tracking-[-0.03em]">General</h2>
              <div className="mt-5 rounded-2xl border border-[var(--line)] p-4">
                <div className="row">
                  <img src="/avatars/you.jpg" alt="" className="avatar" />
                  <div>
                    <div className="text-[14px] font-medium">{settings.accountName}</div>
                    <div className="text-[12px] text-[var(--muted)]">Local Grok Bot clone</div>
                  </div>
                </div>
                <input
                  className="field mt-3"
                  value={settings.accountName}
                  onChange={(e) => onSettings({ accountName: e.target.value })}
                />
              </div>
              <p className="mt-4 text-[13px] text-[var(--muted)]">
                API keys live in <button className="text-link" onClick={() => setTab("Models")}>Settings → Models</button>.
                Without a key, Bots still use the shared computer in local mode.
              </p>
            </section>
          )}

          {tab === "Models" && (
            <ModelsTab
              activeProvider={settings.activeProvider}
              activeModel={settings.activeModel}
              status={providerStatus}
              onSave={onSaveProvider}
              onUse={onUseProvider}
            />
          )}

          {tab === "Plugins" && (
            <>
              <PluginsPanel
                plugins={plugins}
                onInstall={onInstallPlugin}
                onConnect={onConnectPlugin}
                onDisconnect={onDisconnectPlugin}
              />
              <div className="mt-6">
                <div className="mb-2 text-[12px] font-medium">Private skills</div>
                {skills.map((s) => (
                  <div key={s.id} className="mb-2 rounded-xl border border-[var(--line)] p-3">
                    <input
                      className="bg-transparent text-[13px] font-medium outline-none"
                      value={s.name}
                      onChange={(e) => onSkills(skills.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
                    />
                    <textarea
                      className="mt-1 w-full resize-none bg-transparent text-[12px] text-[var(--muted)] outline-none"
                      rows={2}
                      value={s.instructions}
                      onChange={(e) =>
                        onSkills(skills.map((x) => (x.id === s.id ? { ...x, instructions: e.target.value } : x)))
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "Team Setup" && (
            <section>
              <h2 className="text-[18px] font-semibold tracking-[-0.03em]">Team Setup</h2>
              <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-[var(--muted)]">
                Scripts installed on every computer assigned to the current team. This clone keeps a single shared
                workspace at <code>/workspace</code>.
              </p>
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--line-2)] p-6 text-[13px] text-[var(--muted)]">
                No team scripts yet. Drop setup notes in /workspace/projects/ops and every Bot can follow them.
              </div>
            </section>
          )}

          {tab === "Appearance" && (
            <section>
              <h2 className="text-[18px] font-semibold tracking-[-0.03em]">Appearance</h2>
              <div className="mt-4 text-[13px] text-[var(--muted)]">Theme</div>
              <div className="mt-2 flex gap-2">
                {(["system", "light", "dark"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    className={`h-9 rounded-full border px-4 text-[12.5px] capitalize ${
                      settings.theme === t ? "border-[var(--text)]" : "border-[var(--line)]"
                    }`}
                    onClick={() => onSettings({ theme: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>
          )}

          {tab === "Updates" && (
            <Updates settings={settings} onSettings={onSettings} />
          )}
        </div>
      </div>
    </div>
  );
}

function Updates({
  settings,
  onSettings,
}: {
  settings: AppSettings;
  onSettings: (p: Partial<AppSettings>) => void;
}) {
  const [confirm, setConfirm] = useState<"update" | "reset" | null>(null);
  const [note, setNote] = useState("");

  return (
    <section>
      <h2 className="text-[18px] font-semibold tracking-[-0.03em]">Updates</h2>
      <div className="mt-5 space-y-3">
        <Row
          title="Update Grok Bot's Computer"
          body="Moves the box to a fresh instance. Files and logins stay; installed software must be reinstalled."
          action={confirm === "update" ? "Click Again to Confirm" : "Update"}
          onClick={() => {
            if (confirm !== "update") setConfirm("update");
            else {
              setNote("Computer image refreshed. Workspace preserved.");
              setConfirm(null);
            }
          }}
        />
        <Row
          title="Reset Grok Bot's Computer"
          body="Restores the last saved snapshot and can lose recent unsynced work. Prefer Update."
          action="Reset"
          danger
          onClick={() => {
            if (confirm !== "reset") setConfirm("reset");
            else {
              setNote("Reset requested — snapshot restore is simulated in this clone.");
              setConfirm(null);
            }
          }}
        />
        <div className="rounded-2xl border border-[var(--line)] p-4">
          <div className="text-[13px] font-medium">Update Track</div>
          <div className="mt-2 flex gap-2">
            {(["stable", "nightly"] as const).map((t) => (
              <button
                key={t}
                className={`h-8 rounded-full border px-3 text-[12px] capitalize ${
                  settings.updateTrack === t ? "border-[var(--text)]" : "border-[var(--line)]"
                }`}
                onClick={() => onSettings({ updateTrack: t })}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            className="mt-3 text-[12.5px] text-link"
            onClick={() => setNote("You're on the latest clone build.")}
          >
            Check for Updates
          </button>
        </div>
        {note && <div className="text-[12.5px] text-[var(--muted)]">{note}</div>}
      </div>
    </section>
  );
}

function Row({
  title,
  body,
  action,
  onClick,
  danger,
}: {
  title: string;
  body: string;
  action: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] p-4">
      <div>
        <div className="text-[13px] font-medium">{title}</div>
        <div className="mt-1 max-w-md text-[12px] text-[var(--muted)]">{body}</div>
      </div>
      <button
        className={`h-8 shrink-0 rounded-full px-3 text-[12px] ${
          danger ? "border border-danger/40 text-danger" : "bg-[var(--text)] text-[var(--invert)]"
        }`}
        onClick={onClick}
      >
        {action}
      </button>
    </div>
  );
}

function ModelsTab({
  activeProvider,
  activeModel,
  status,
  onSave,
  onUse,
}: {
  activeProvider: string;
  activeModel: string;
  status: Record<ProviderId, ProviderStatus>;
  onSave: (id: ProviderId, data: { key?: string; model?: string; baseUrl?: string; clear?: boolean }) => Promise<void>;
  onUse: (id: ProviderId, model: string) => void;
}) {
  return (
    <section>
      <h2 className="text-[18px] font-semibold tracking-[-0.03em]">Models</h2>
      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
        Save a key per provider, pick a model, then use it for every Bot. Keys stay on this machine (and in the
        browser so Vercel deploys keep working). You can also set the matching env var.
      </p>
      <div className="mt-4 space-y-3">
        {PROVIDERS.map((p) => (
          <ProviderCard
            key={p.id}
            def={p}
            active={activeProvider === p.id}
            activeModel={activeModel}
            status={status[p.id]}
            onSave={onSave}
            onUse={onUse}
          />
        ))}
      </div>
    </section>
  );
}

function ProviderCard({
  def,
  active,
  status,
  onSave,
  onUse,
}: {
  def: (typeof PROVIDERS)[number];
  active: boolean;
  activeModel: string;
  status: ProviderStatus;
  onSave: (id: ProviderId, data: { key?: string; model?: string; baseUrl?: string; clear?: boolean }) => Promise<void>;
  onUse: (id: ProviderId, model: string) => void;
}) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(status?.model || def.defaultModel);
  const [custom, setCustom] = useState("");
  const [baseUrl, setBaseUrl] = useState(status?.baseUrl || def.baseUrl);
  const [note, setNote] = useState("");

  useEffect(() => {
    setModel(status?.model || def.defaultModel);
    setBaseUrl(status?.baseUrl || def.baseUrl);
  }, [status?.model, status?.baseUrl, def.defaultModel, def.baseUrl]);

  const chosen = custom.trim() || model;

  return (
    <div className={`rounded-2xl border p-4 ${active ? "border-[var(--text)]" : "border-[var(--line)]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-medium">{def.name}</div>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">{def.hint}</p>
        </div>
        <span className={`pill ${status?.configured ? "live" : ""}`}>
          {status?.configured ? `Connected${status.source ? ` · ${status.source}` : ""}` : "No key"}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          className="field"
          type="password"
          placeholder={status?.configured ? "••••••••  (leave blank to keep)" : def.placeholder}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <select
          className="field"
          value={def.models.some((m) => m.id === model) ? model : "__custom"}
          onChange={(e) => setModel(e.target.value)}
        >
          {def.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value="__custom">Custom model id…</option>
        </select>
      </div>
      {(model === "__custom" || !def.models.some((m) => m.id === model)) && (
        <input
          className="field mt-2"
          placeholder="Custom model id"
          value={custom || (def.models.some((m) => m.id === model) ? "" : model)}
          onChange={(e) => {
            setCustom(e.target.value);
            setModel("__custom");
          }}
        />
      )}
      {def.allowBaseUrl && (
        <input
          className="field mt-2"
          placeholder="Base URL"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="h-8 rounded-full bg-[var(--text)] px-3 text-[12px] font-medium text-[var(--invert)]"
          onClick={async () => {
            await onSave(def.id, {
              key: key.trim() || undefined,
              model: chosen === "__custom" ? custom.trim() : chosen,
              baseUrl: def.allowBaseUrl ? baseUrl : undefined,
            });
            setKey("");
            setNote("Saved");
            setTimeout(() => setNote(""), 1500);
          }}
        >
          Save
        </button>
        <button
          className="h-8 rounded-full border border-[var(--line-2)] px-3 text-[12px]"
          onClick={() => onUse(def.id, chosen === "__custom" ? custom.trim() || def.defaultModel : chosen)}
        >
          Use this
        </button>
        <button
          className="h-8 rounded-full border border-[var(--line-2)] px-3 text-[12px]"
          onClick={async () => {
            setNote("Testing…");
            const res = await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                op: "probe",
                provider: def.id,
                key: key.trim() || undefined,
                model: chosen === "__custom" ? custom.trim() : chosen,
              }),
            });
            const json = await res.json().catch(() => ({ ok: false, error: "Request failed" }));
            setNote(json.ok ? `Reachable · ${json.provider}` : String(json.error || "Failed"));
            setTimeout(() => setNote(""), 4000);
          }}
        >
          Test
        </button>
        {status?.configured && (
          <button
            className="h-8 rounded-full px-3 text-[12px] text-danger"
            onClick={async () => {
              await onSave(def.id, { clear: true });
              setNote("Cleared");
              setTimeout(() => setNote(""), 1500);
            }}
          >
            Remove key
          </button>
        )}
        <a className="ml-auto text-[11.5px] text-link" href={def.docs} target="_blank" rel="noreferrer">
          Get a key
        </a>
        {note && <span className="text-[12px] text-pulse">{note}</span>}
      </div>
      <div className="mt-2 text-[11px] text-[var(--dim)]">
        Env var <code>{def.envVar}</code>
        {active ? " · in use" : ""}
      </div>
    </div>
  );
}
