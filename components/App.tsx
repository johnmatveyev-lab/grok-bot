"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { AgentPane } from "./AgentPane";
import { ChatView, FirstTasks } from "./ChatView";
import { CommandPalette } from "./CommandPalette";
import { Composer } from "./Composer";
import { ComputerView } from "./ComputerView";
import { EditProfile } from "./EditProfile";
import { NewChat } from "./NewChat";
import { Onboarding } from "./Onboarding";
import { ModelPicker } from "./ModelPicker";
import { SettingsModal } from "./SettingsModal";
import { Sidebar } from "./Sidebar";
import { BOT_TEMPLATES, blankBot, templateToChat, type BotTemplate } from "@/lib/defaults";
import {
  emptyProviderStatus,
  loadLocalProviderKeys,
  saveLocalProviderKeys,
  type ProviderId,
  type ProviderStatus,
} from "@/lib/providers";
import { loadPluginCreds, setPluginCred } from "@/lib/plugins";
import { emptyPersist, loadPersist, savePersist } from "@/lib/storage";
import type { Chat, ComputerState, Message, PersistShape, Routine } from "@/lib/types";
import { uid } from "@/lib/uid";

const defaultComputer = (): ComputerState => ({
  status: "idle",
  app: "desktop",
  cwd: "/workspace",
  url: "",
  termLines: [
    { kind: "out", text: "Grok Bot computer · shared workspace at /workspace" },
    { kind: "out", text: "Type a command, or ask a Bot to use the terminal." },
  ],
});

export function App() {
  const [hydrated, setHydrated] = useState(false);
  const [store, setStore] = useState<PersistShape>(emptyPersist);
  const [query, setQuery] = useState("");
  const [pane, setPane] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [computerOpen, setComputerOpen] = useState(false);
  const [computer, setComputer] = useState<ComputerState>(defaultComputer);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null);
  const [providerStatus, setProviderStatus] = useState<Record<ProviderId, ProviderStatus>>(emptyProviderStatus);
  const [settingsTab, setSettingsTab] = useState<"General" | "Models" | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const next = loadPersist();
    setStore(next);
    setHydrated(true);
    if (window.innerWidth >= 980) setPane(true);
    void fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.providers) setProviderStatus(s.providers);
        const local = loadLocalProviderKeys();
        const mergedStatus = { ...(s.providers || {}) };
        for (const [id, cfg] of Object.entries(local)) {
          if (cfg?.key && mergedStatus[id]) {
            mergedStatus[id] = { ...mergedStatus[id], configured: true, model: cfg.model || mergedStatus[id].model };
          }
        }
        setStore((prev) => {
          const current = prev.settings.activeProvider || s.activeProvider || "xai";
          const currentOk = Boolean(mergedStatus[current]?.configured);
          const firstOk = Object.entries(mergedStatus).find(([, st]) => (st as { configured?: boolean })?.configured)?.[0] || current;
          const chosen = currentOk ? current : firstOk;
          return {
            ...prev,
            settings: {
              ...prev.settings,
              apiKeyConfigured: Boolean(s.apiKeyConfigured) || Object.values(local).some((c) => Boolean(c?.key)),
              activeProvider: chosen,
              activeModel:
                mergedStatus[chosen]?.model ||
                prev.settings.activeModel ||
                s.providers?.[chosen]?.model ||
                prev.settings.activeModel,
            },
          };
        });
        setProviderStatus((prev) => {
          const next = { ...prev, ...(s.providers || {}) };
          for (const [id, cfg] of Object.entries(local)) {
            if (cfg?.key && next[id as ProviderId]) next[id as ProviderId] = { ...next[id as ProviderId], configured: true, model: cfg.model || next[id as ProviderId].model };
          }
          return next;
        });
      })
      .catch(() => undefined);
    const localCreds = loadPluginCreds();
    if (Object.keys(localCreds).length) {
      setStore((prev) => ({
        ...prev,
        plugins: prev.plugins.map((p) =>
          localCreds[p.id] && Object.values(localCreds[p.id]).some(Boolean)
            ? { ...p, installed: true, authenticated: true }
            : p
        ),
      }));
    }
    void fetch("/api/plugins")
      .then((r) => r.json())
      .then((s) => {
        if (!s.plugins) return;
        setStore((prev) => ({
          ...prev,
          plugins: prev.plugins.map((p) => {
            const hit = (s.plugins as { id: string; connected?: boolean }[]).find((x) => x.id === p.id);
            return hit?.connected ? { ...p, installed: true, authenticated: true } : p;
          }),
        }));
      })
      .catch(() => undefined);
    void fetch("/api/computer?op=state")
      .then((r) => r.json())
      .then((s) => setComputer((prev) => ({ ...prev, ...s })))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (hydrated) savePersist(store);
  }, [store, hydrated]);

  useEffect(() => {
    const apply = () => {
      const t = store.settings.theme;
      const dark =
        t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [store.settings.theme]);

  const active = useMemo(
    () => store.chats.find((c) => c.id === store.activeId) || null,
    [store.chats, store.activeId]
  );

  const patchChat = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setStore((s) => ({
      ...s,
      chats: s.chats.map((c) => (c.id === id ? fn(c) : c)),
    }));
  }, []);

  const addChat = useCallback((chat: Chat, activate = true) => {
    setStore((s) => ({
      ...s,
      chats: [chat, ...s.chats],
      activeId: activate ? chat.id : s.activeId,
    }));
    setNewOpen(false);
    setSidebarOpen(false);
  }, []);

  const finishOnboarding = (picked: BotTemplate[], custom?: { name: string; title: string; description: string }) => {
    const chats = picked.map(templateToChat);
    if (custom) {
      const bot = blankBot();
      chats.unshift({
        ...bot,
        name: custom.name,
        title: custom.title,
        description: custom.description,
      });
    }
    if (!chats.length) chats.push(templateToChat(BOT_TEMPLATES[0]));
    setStore((s) => ({
      ...s,
      onboarded: true,
      chats,
      activeId: chats[0].id,
      pinnedIds: [chats[0].id],
    }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setNewOpen(true);
      }
      if (meta && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setPane((v) => !v);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setNewOpen(false);
        setSettingsOpen(false);
        setEditOpen(false);
        setComputerOpen(false);
        setCtx(null);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = async (text: string, extras?: { attachments?: Message["attachments"] }) => {
    if (!active) return;
    const chatId = active.id;
    const userMsg: Message = {
      id: uid("m"),
      role: "user",
      content: text,
      createdAt: Date.now(),
      attachments: extras?.attachments,
    };
    const asstId = uid("m");
    const asst: Message = {
      id: asstId,
      role: "assistant",
      authorId: resolveResponder(active, store.chats, text)?.id || active.id,
      content: "",
      createdAt: Date.now(),
      tools: [],
    };

    const nextChat: Chat = {
      ...active,
      messages: [...active.messages, userMsg, asst],
      working: true,
      updatedAt: Date.now(),
    };
    patchChat(chatId, () => nextChat);
    setComputer((c) => ({ ...c, status: "working", screenBotId: chatId }));

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          chat: nextChat,
          roster: store.chats.filter((c) => c.kind === "bot").map((c) => ({ name: c.name, title: c.title })),
          skills: store.skills,
          plugins: store.plugins,
          userText: text,
          provider: store.settings.activeProvider,
          model: store.settings.activeModel,
          providerKey: loadLocalProviderKeys()[store.settings.activeProvider as ProviderId]?.key,
          providerKeys: Object.fromEntries(
            Object.entries(loadLocalProviderKeys())
              .filter(([, cfg]) => Boolean(cfg?.key))
              .map(([id, cfg]) => [id, String(cfg?.key)])
          ),
          baseUrl: loadLocalProviderKeys()[store.settings.activeProvider as ProviderId]?.baseUrl,
          pluginCreds: loadPluginCreds(),
        }),
      });
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          handleEvent(chatId, asstId, ev);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        patchChat(chatId, (c) => ({
          ...c,
          working: false,
          messages: c.messages.map((m) =>
            m.id === asstId
              ? { ...m, content: m.content || `Something broke: ${(e as Error).message}` }
              : m
          ),
        }));
      }
    } finally {
      patchChat(chatId, (c) => ({ ...c, working: false, updatedAt: Date.now() }));
      setComputer((c) => ({ ...c, status: "idle" }));
    }
  };

  const handleEvent = (chatId: string, asstId: string, ev: Record<string, unknown>) => {
    const type = String(ev.type || "");
    if (type === "text") {
      const chunk = String(ev.text || "");
      patchChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === asstId ? { ...m, content: m.content + chunk } : m)),
      }));
    }
    if (type === "tool") {
      const id = String(ev.id || uid("t"));
      patchChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) => {
          if (m.id !== asstId) return m;
          const tools = [...(m.tools || [])];
          const i = tools.findIndex((t) => t.id === id);
          const next = {
            id,
            name: String(ev.name || ""),
            args: (ev.args as Record<string, unknown>) || tools[i]?.args || {},
            result: ev.result != null ? String(ev.result) : tools[i]?.result,
            status: (ev.status as "running" | "done" | "error") || "running",
          };
          if (i >= 0) tools[i] = { ...tools[i], ...next };
          else tools.push(next);
          return { ...m, tools };
        }),
      }));
    }
    if (type === "computer") {
      setComputer((prev) => ({
        ...prev,
        status: "working",
        app: (ev.app as ComputerState["app"]) || prev.app,
        cwd: typeof ev.cwd === "string" ? ev.cwd : prev.cwd,
        url: typeof ev.url === "string" ? ev.url : prev.url,
        pageTitle: typeof ev.title === "string" ? ev.title : prev.pageTitle,
        lastCommand: typeof ev.command === "string" ? ev.command : prev.lastCommand,
        lastOutput: typeof ev.output === "string" ? ev.output : prev.lastOutput,
      }));
    }
    if (type === "memory" && ev.note) {
      patchChat(chatId, (c) => ({ ...c, memory: [...c.memory, String(ev.note)] }));
    }
    if (type === "routine" && ev.routine) {
      const r = ev.routine as { name: string; schedule: string; instructions: string };
      const routine: Routine = {
        id: uid("r"),
        name: r.name,
        schedule: r.schedule,
        instructions: r.instructions,
        enabled: true,
        nextRun: r.schedule,
        history: [],
      };
      patchChat(chatId, (c) => ({ ...c, routines: [routine, ...c.routines] }));
    }
    if (type === "skill" && ev.skill) {
      const sk = ev.skill as { name: string; description?: string; instructions: string };
      const id = uid("skill");
      setStore((s) => ({
        ...s,
        skills: [
          { id, name: sk.name, description: sk.description || "", instructions: sk.instructions, private: true },
          ...s.skills,
        ],
      }));
      patchChat(chatId, (c) => ({ ...c, enabledSkillIds: [...c.enabledSkillIds, id] }));
    }
    if (type === "approval" && ev.approval) {
      const a = ev.approval as { action: string; detail: string };
      patchChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === asstId
            ? { ...m, approval: { id: uid("a"), action: a.action, detail: a.detail, status: "pending" } }
            : m
        ),
      }));
    }
    if (type === "handoff" && ev.handoff) {
      const h = ev.handoff as { bot: string; message: string };
      setStore((s) => {
        const target = s.chats.find((c) => c.name.toLowerCase() === h.bot.toLowerCase());
        if (!target) return s;
        const note: Message = {
          id: uid("m"),
          role: "user",
          content: `Handoff from ${s.chats.find((c) => c.id === chatId)?.name || "a Bot"}: ${h.message}`,
          createdAt: Date.now(),
        };
        return {
          ...s,
          chats: s.chats.map((c) =>
            c.id === target.id ? { ...c, messages: [...c.messages, note], unread: c.unread + 1, updatedAt: Date.now() } : c
          ),
        };
      });
    }
    if (type === "error") {
      patchChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === asstId ? { ...m, content: m.content || `Error: ${String(ev.error || "failed")}` } : m
        ),
      }));
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    if (active) patchChat(active.id, (c) => ({ ...c, working: false }));
    setComputer((c) => ({ ...c, status: "idle" }));
  };

  const runRoutine = (id: string) => {
    const r = active?.routines.find((x) => x.id === id);
    if (!r || !active) return;
    patchChat(active.id, (c) => ({
      ...c,
      routines: c.routines.map((x) =>
        x.id === id
          ? { ...x, lastRun: Date.now(), history: [{ at: Date.now(), ok: true, note: "Test run" }, ...x.history].slice(0, 20) }
          : x
      ),
    }));
    void send(`Run a test of the routine “${r.name}” now.\n\nSchedule: ${r.schedule}\nInstructions:\n${r.instructions}\n\nThis is a test run. Do real preparation work in /workspace, but stop before any external send/pay/publish.`);
  };

  if (!hydrated) {
    return (
      <div className="grid h-full place-items-center text-[13px] text-[var(--muted)]">
        Opening Grok Bot…
      </div>
    );
  }

  if (!store.onboarded) {
    return <Onboarding onDone={finishOnboarding} />;
  }

  return (
    <div className={`app-shell h-full ${pane ? "with-pane" : ""}`}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        chats={store.chats}
        activeId={store.activeId}
        pinnedIds={store.pinnedIds}
        query={query}
        onQuery={setQuery}
        onSelect={(id) => {
          setStore((s) => ({
            ...s,
            activeId: id,
            chats: s.chats.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
          }));
          setSidebarOpen(false);
          if (window.innerWidth < 980) setPane(false);
        }}
        onNew={() => setNewOpen(true)}
        onAccount={() => setSettingsOpen(true)}
        onComputer={() => setComputerOpen(true)}
        computerStatus={computer.status}
        accountName={store.settings.accountName}
        open={sidebarOpen}
        showHidden={showHidden}
        onToggleHidden={() => setShowHidden((v) => !v)}
        onContext={(id, x, y) => setCtx({ id, x, y })}
      />

      <main className="main">
        <div className="relative z-40 flex h-10 items-center gap-2 border-b border-[var(--line)] px-2 md:hidden">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <Menu size={16} />
          </button>
          <div className="text-[13px] font-medium">{active?.name || "Grok Bot"}</div>
        </div>
        {active ? (
          <>
            <ChatView
              chat={active}
              chats={store.chats}
              onOpenPane={() => setPane(true)}
              onOpenComputer={() => setComputerOpen(true)}
              onMenu={() => setEditOpen(true)}
              onStop={stop}
              modelPicker={
                <ModelPicker
                  provider={store.settings.activeProvider}
                  model={store.settings.activeModel}
                  status={providerStatus}
                  onChange={(id, model) =>
                    setStore((s) => ({
                      ...s,
                      settings: { ...s.settings, activeProvider: id, activeModel: model },
                    }))
                  }
                  onAddKeys={() => {
                    setSettingsTab("Models");
                    setSettingsOpen(true);
                  }}
                />
              }
              onReact={(messageId, emoji) =>
                patchChat(active.id, (c) => ({
                  ...c,
                  messages: c.messages.map((m) => {
                    if (m.id !== messageId) return m;
                    const reactions = [...(m.reactions || [])];
                    const i = reactions.findIndex((r) => r.emoji === emoji);
                    if (i >= 0) reactions[i] = { ...reactions[i], count: reactions[i].count + 1 };
                    else reactions.push({ emoji, count: 1 });
                    return { ...m, reactions };
                  }),
                }))
              }
              onApprove={(messageId, status) => {
                patchChat(active.id, (c) => ({
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId && m.approval ? { ...m, approval: { ...m.approval, status } } : m
                  ),
                }));
                void send(
                  status === "approved"
                    ? "Approved. Continue from that approval request."
                    : "Rejected. Do not take that action. Propose an alternative."
                );
              }}
            />
            <div className="mx-auto w-full max-w-[760px] px-4 pb-5 sm:px-8">
              {!active.messages.length && !active.working && (
                <FirstTasks chat={active} onPick={(t) => void send(t)} />
              )}
              <Composer
                chats={store.chats}
                skills={store.skills}
                plugins={store.plugins}
                disabled={active.working}
                onSend={(t, e) => void send(t, e)}
              />
              {!store.settings.apiKeyConfigured && (
                <button
                  className="mt-2 w-full text-center text-[11.5px] text-[var(--dim)] hover:text-[var(--muted)]"
                  onClick={() => {
                    setSettingsTab("Models");
                    setSettingsOpen(true);
                  }}
                >
                  Local mode — add an API key in Settings → Models
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-[13px] text-[var(--muted)]">
            Create a Bot to start handing off work.
          </div>
        )}
      </main>

      {pane && active && (
        <AgentPane
          chat={active}
          chats={store.chats}
          open
          onClose={() => setPane(false)}
          onComputer={() => setComputerOpen(true)}
          onEdit={() => setEditOpen(true)}
          onToggleRoutine={(id) =>
            patchChat(active.id, (c) => ({
              ...c,
              routines: c.routines.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
            }))
          }
          onRunRoutine={runRoutine}
          onDeleteRoutine={(id) =>
            patchChat(active.id, (c) => ({ ...c, routines: c.routines.filter((r) => r.id !== id) }))
          }
        />
      )}

      <ComputerView
        open={computerOpen}
        state={computer}
        onClose={() => setComputerOpen(false)}
        onState={(partial) => {
          setComputer((s) => ({ ...s, ...partial }));
          void fetch("/api/computer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ op: "state", state: partial }),
          });
        }}
      />

      <SettingsModal
        open={settingsOpen}
        settings={store.settings}
        plugins={store.plugins}
        skills={store.skills}
        providerStatus={providerStatus}
        initialTab={settingsTab}
        onClose={() => {
          setSettingsOpen(false);
          setSettingsTab(undefined);
        }}
        onSettings={(p) => setStore((s) => ({ ...s, settings: { ...s.settings, ...p } }))}
        onSkills={(skills) => setStore((s) => ({ ...s, skills }))}
        onInstallPlugin={(id, installed) => {
          if (!installed) setPluginCred(id, null);
          setStore((s) => ({
            ...s,
            plugins: s.plugins.map((p) =>
              p.id === id ? { ...p, installed, authenticated: installed ? p.authenticated : false } : p
            ),
          }));
          if (!installed) {
            void fetch("/api/plugins", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, op: "clear" }),
            });
          }
        }}
        onConnectPlugin={async (id, creds) => {
          const existing = loadPluginCreds()[id] || {};
          const merged = { ...existing };
          for (const [k, v] of Object.entries(creds)) if (v.trim()) merged[k] = v.trim();
          const res = await fetch("/api/plugins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, creds: merged }),
          });
          const json = await res.json().catch(() => ({ ok: false, error: "Request failed" }));
          if (json.ok) {
            setPluginCred(id, merged);
            setStore((s) => ({
              ...s,
              plugins: s.plugins.map((p) => (p.id === id ? { ...p, installed: true, authenticated: true } : p)),
            }));
          }
          return json;
        }}
        onDisconnectPlugin={async (id) => {
          setPluginCred(id, null);
          setStore((s) => ({
            ...s,
            plugins: s.plugins.map((p) => (p.id === id ? { ...p, authenticated: false } : p)),
          }));
          await fetch("/api/plugins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, op: "clear" }),
          });
        }}
        onUseProvider={(id, model) =>
          setStore((s) => ({
            ...s,
            settings: { ...s.settings, activeProvider: id, activeModel: model, apiKeyConfigured: true },
          }))
        }
        onSaveProvider={async (id, data) => {
          const local = loadLocalProviderKeys();
          if (data.key && !data.clear) {
            setStore((s) => ({
              ...s,
              settings: {
                ...s.settings,
                activeProvider: id,
                activeModel: data.model || s.settings.activeModel,
                apiKeyConfigured: true,
              },
            }));
          }
          if (data.clear) {
            const next = { ...local };
            if (next[id]) {
              const { key: _k, ...rest } = next[id]!;
              next[id] = rest;
            }
            saveLocalProviderKeys(next);
          } else {
            saveLocalProviderKeys({
              ...local,
              [id]: {
                ...local[id],
                ...(data.key ? { key: data.key } : {}),
                ...(data.model ? { model: data.model } : {}),
                ...(data.baseUrl ? { baseUrl: data.baseUrl } : {}),
              },
            });
          }
          const res = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: id,
              activeProvider: data.clear ? undefined : id,
              ...data,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (json.providers) setProviderStatus(json.providers);
          else {
            setProviderStatus((prev) => ({
              ...prev,
              [id]: {
                ...prev[id],
                configured: data.clear ? false : Boolean(data.key) || prev[id].configured,
                model: data.model || prev[id].model,
                baseUrl: data.baseUrl || prev[id].baseUrl,
              },
            }));
          }
          const listed = (json.providers || providerStatus) as Record<string, ProviderStatus>;
          const any = Object.values(listed).some((s) => s.configured) || Boolean(data.key && !data.clear);
          setStore((s) => ({
            ...s,
            settings: {
              ...s.settings,
              apiKeyConfigured: Boolean(json.apiKeyConfigured ?? any),
              activeModel: data.model || s.settings.activeModel,
            },
          }));
        }}
      />

      <NewChat
        open={newOpen}
        chats={store.chats}
        onClose={() => setNewOpen(false)}
        onCreateBot={(draft) => addChat({ ...blankBot(), ...draft })}
        onCreateFromTemplate={(key) => {
          const t = BOT_TEMPLATES.find((x) => x.key === key);
          if (t) addChat(templateToChat(t));
        }}
        onCreateGroup={(memberIds, name) => {
          const first = store.chats.find((c) => c.id === memberIds[0]);
          addChat({
            ...blankBot(),
            kind: "group",
            name,
            title: "Group",
            description: "Bots in this thread can pass work and only pull you in for judgment calls.",
            avatar: first?.avatar || "/avatars/nova.jpg",
            memberIds,
          });
        }}
      />

      <EditProfile
        open={editOpen}
        chat={active}
        skills={store.skills}
        onClose={() => setEditOpen(false)}
        onSave={(patch) => active && patchChat(active.id, (c) => ({ ...c, ...patch }))}
        onDuplicate={() => {
          if (!active || active.kind !== "bot") return;
          addChat({
            ...active,
            id: uid("c"),
            name: `${active.name} copy`,
            messages: [],
            memory: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          setEditOpen(false);
        }}
        onDelete={() => {
          if (!active) return;
          if (!confirm(`Delete ${active.name}? This removes the conversation and routines.`)) return;
          setStore((s) => {
            const chats = s.chats.filter((c) => c.id !== active.id);
            return { ...s, chats, activeId: chats[0]?.id || null, pinnedIds: s.pinnedIds.filter((id) => id !== active.id) };
          });
          setEditOpen(false);
        }}
      />

      <CommandPalette
        open={palette}
        chats={store.chats}
        onClose={() => setPalette(false)}
        onSelect={(id) => {
          setStore((s) => ({ ...s, activeId: id }));
          setPalette(false);
        }}
        onAction={(a) => {
          setPalette(false);
          if (a === "new") setNewOpen(true);
          if (a === "settings") setSettingsOpen(true);
          if (a === "computer") setComputerOpen(true);
        }}
      />

      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          pinned={store.pinnedIds.includes(ctx.id)}
          hidden={Boolean(store.chats.find((c) => c.id === ctx.id)?.hidden)}
          onClose={() => setCtx(null)}
          onPin={() => {
            setStore((s) => ({
              ...s,
              pinnedIds: s.pinnedIds.includes(ctx.id) ? s.pinnedIds.filter((id) => id !== ctx.id) : [ctx.id, ...s.pinnedIds],
            }));
            setCtx(null);
          }}
          onHide={() => {
            const id = ctx.id;
            setStore((s) => {
              const chats = s.chats.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c));
              const activeId = s.activeId === id && chats.find((c) => c.id === id)?.hidden ? chats.find((c) => !c.hidden)?.id || s.activeId : s.activeId;
              return { ...s, chats, activeId };
            });
            setCtx(null);
          }}
          onDelete={() => {
            const target = store.chats.find((c) => c.id === ctx.id);
            if (!target) return;
            if (!confirm(`Delete ${target.name}? This removes the conversation and routines.`)) return;
            setStore((s) => {
              const chats = s.chats.filter((c) => c.id !== ctx.id);
              return {
                ...s,
                chats,
                activeId: s.activeId === ctx.id ? chats[0]?.id || null : s.activeId,
                pinnedIds: s.pinnedIds.filter((id) => id !== ctx.id),
              };
            });
            setCtx(null);
          }}
        />
      )}
    </div>
  );
}

function ContextMenu({
  x,
  y,
  pinned,
  hidden,
  onClose,
  onPin,
  onHide,
  onDelete,
}: {
  x: number;
  y: number;
  pinned: boolean;
  hidden: boolean;
  onClose: () => void;
  onPin: () => void;
  onHide: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [onClose]);
  return (
    <div
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-xl border border-[var(--line-2)] bg-[var(--bg-3)] py-1 shadow-pane"
      style={{ left: Math.min(x, window.innerWidth - 200), top: Math.min(y, window.innerHeight - 160) }}
    >
      <button className="bot-row rounded-none" onClick={onPin}>
        {pinned ? "Unpin" : "Pin"}
      </button>
      <button className="bot-row rounded-none" onClick={onHide}>
        {hidden ? "Unhide" : "Hide from sidebar"}
      </button>
      <button className="bot-row rounded-none text-danger" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

function resolveResponder(chat: Chat, chats: Chat[], text: string): Chat | null {
  if (chat.kind !== "group") return chat;
  const mention = text.match(/@([A-Za-z0-9 _-]+)/);
  if (mention) {
    const name = mention[1].trim().toLowerCase();
    const hit = chats.find((c) => chat.memberIds?.includes(c.id) && c.name.toLowerCase() === name);
    if (hit) return hit;
  }
  const first = chats.find((c) => c.id === chat.memberIds?.[0]);
  return first || chat;
}
