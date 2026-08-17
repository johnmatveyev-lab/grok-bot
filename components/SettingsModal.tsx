"use client";

import { useState } from "react";
import type { AppSettings, Plugin, Skill, Theme } from "@/lib/types";

const TABS = ["General", "Plugins", "Team Setup", "Appearance", "Updates"] as const;
type Tab = (typeof TABS)[number];

export function SettingsModal({
  open,
  settings,
  plugins,
  skills,
  onClose,
  onSettings,
  onPlugins,
  onSkills,
  onSaveKey,
  apiConfigured,
}: {
  open: boolean;
  settings: AppSettings;
  plugins: Plugin[];
  skills: Skill[];
  apiConfigured: boolean;
  onClose: () => void;
  onSettings: (p: Partial<AppSettings>) => void;
  onPlugins: (p: Plugin[]) => void;
  onSkills: (s: Skill[]) => void;
  onSaveKey: (key: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("General");
  const [key, setKey] = useState("");
  const [q, setQ] = useState("");
  const [plugView, setPlugView] = useState<"Marketplace" | "Yours">("Marketplace");
  const [saved, setSaved] = useState("");

  if (!open) return null;

  const filtered = plugins.filter((p) => `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q.toLowerCase()));

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
              <div className="mt-4 rounded-2xl border border-[var(--line)] p-4">
                <div className="text-[13px] font-medium">xAI API key</div>
                <p className="mt-1 text-[12.5px] text-[var(--muted)]">
                  Stored on this machine only. Used server-side against api.x.ai with model grok-4.6.{" "}
                  {apiConfigured ? "A key is configured." : "No key yet — Bots will still use the shared computer in local mode."}
                </p>
                <input
                  className="field mt-3"
                  type="password"
                  placeholder="xai-..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
                <button
                  className="mt-3 h-9 rounded-full bg-[var(--text)] px-4 text-[12.5px] font-medium text-[var(--invert)]"
                  onClick={async () => {
                    await onSaveKey(key);
                    setKey("");
                    setSaved("Saved");
                    setTimeout(() => setSaved(""), 1500);
                  }}
                >
                  Save key
                </button>
                {saved && <span className="ml-3 text-[12px] text-pulse">{saved}</span>}
              </div>
            </section>
          )}

          {tab === "Plugins" && (
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.03em]">Plugins</h2>
                  <p className="mt-1 text-[12.5px] text-[var(--muted)]">Connectors and private skills. Type @ in chat to attach one.</p>
                </div>
                <div className="flex rounded-full bg-[var(--bg-4)] p-0.5 text-[12px]">
                  {(["Marketplace", "Yours"] as const).map((v) => (
                    <button
                      key={v}
                      className={`rounded-full px-3 py-1 ${plugView === v ? "bg-[var(--bg-3)]" : "text-[var(--muted)]"}`}
                      onClick={() => setPlugView(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <input className="field mt-4" placeholder="Search plugins" value={q} onChange={(e) => setQ(e.target.value)} />
              {plugView === "Marketplace" && (
                <div className="mt-4 grid gap-2">
                  {filtered.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] p-3">
                      <div>
                        <div className="text-[13.5px] font-medium">{p.name}</div>
                        <div className="text-[12px] text-[var(--muted)]">
                          {p.category} · {p.description}
                        </div>
                      </div>
                      <button
                        className="h-8 rounded-full border border-[var(--line-2)] px-3 text-[12px]"
                        onClick={() =>
                          onPlugins(
                            plugins.map((x) =>
                              x.id === p.id
                                ? { ...x, installed: !x.installed, authenticated: !x.installed }
                                : x
                            )
                          )
                        }
                      >
                        {p.installed ? "Uninstall" : "Add"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {plugView === "Yours" && (
                <div className="mt-4 space-y-5">
                  <div>
                    <div className="mb-2 text-[12px] font-medium">Installed</div>
                    {plugins.filter((p) => p.installed).map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl py-2">
                        <div>
                          <div className="text-[13px]">{p.name}</div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {p.authenticated ? "Connected" : "Needs sign-in"}
                          </div>
                        </div>
                        {!p.authenticated && (
                          <button
                            className="text-[12px] text-link"
                            onClick={() => onPlugins(plugins.map((x) => (x.id === p.id ? { ...x, authenticated: true } : x)))}
                          >
                            Authenticate
                          </button>
                        )}
                      </div>
                    ))}
                    {!plugins.some((p) => p.installed) && (
                      <p className="text-[12px] text-[var(--dim)]">Nothing installed yet.</p>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 text-[12px] font-medium">Private skills</div>
                    {skills.map((s) => (
                      <div key={s.id} className="rounded-xl border border-[var(--line)] p-3 mb-2">
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
                </div>
              )}
            </section>
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
