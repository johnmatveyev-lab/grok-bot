"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Folder, Globe, RotateCw, Terminal, X } from "lucide-react";
import type { ComputerFile, ComputerState } from "@/lib/types";

export function ComputerView({
  open,
  state,
  onClose,
  onState,
}: {
  open: boolean;
  state: ComputerState;
  onClose: () => void;
  onState: (s: Partial<ComputerState>) => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="flex h-[min(860px,100%)] w-[min(1120px,100%)] flex-col overflow-hidden rounded-[18px] border border-[var(--line-2)] bg-[var(--bg-3)] shadow-pane"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="win-bar">
          <span className="dot bg-[#ff5f57]" />
          <span className="dot bg-[#febc2e]" />
          <span className="dot bg-[#28c840]" />
          <div className="ml-2 text-[12.5px] font-medium">Agent Computer</div>
          <div className="ml-auto row">
            <span className={`pill ${state.status === "working" ? "live" : ""}`}>{state.status}</span>
            <button className="icon-btn" onClick={onClose}>
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <nav className="w-[200px] shrink-0 border-r border-[var(--line)] p-2">
            {(
              [
                ["desktop", "Desktop", Folder],
                ["files", "Files", Folder],
                ["browser", "Browser", Globe],
                ["terminal", "Terminal", Terminal],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                className={`bot-row ${state.app === id ? "active" : ""}`}
                onClick={() => onState({ app: id })}
              >
                <div className="row text-[13px]">
                  <Icon size={14} />
                  {label}
                </div>
              </button>
            ))}
            <p className="mt-4 px-2 text-[11px] leading-relaxed text-[var(--dim)]">
              Shared by every Bot. Files, sessions, and logins are account-wide — not isolated per teammate.
            </p>
          </nav>
          <div className="min-w-0 flex-1 p-3">
            {state.app === "desktop" && <Desktop onOpen={(app) => onState({ app })} />}
            {state.app === "files" && <Files cwd={state.cwd} onCwd={(cwd) => onState({ cwd })} />}
            {state.app === "browser" && <Browser state={state} onState={onState} />}
            {state.app === "terminal" && <Term state={state} onState={onState} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Desktop({ onOpen }: { onOpen: (app: ComputerState["app"]) => void }) {
  return (
    <div className="desktop h-full min-h-[420px]" style={{ backgroundImage: "url(/computer/wallpaper.jpg)" }}>
      <div className="flex gap-2 p-6">
        <button className="desk-icon" onClick={() => onOpen("files")}>
          <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <Folder />
          </div>
          Files
        </button>
        <button className="desk-icon" onClick={() => onOpen("browser")}>
          <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <Globe />
          </div>
          Browser
        </button>
        <button className="desk-icon" onClick={() => onOpen("terminal")}>
          <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <Terminal />
          </div>
          Terminal
        </button>
      </div>
    </div>
  );
}

function Files({ cwd, onCwd }: { cwd: string; onCwd: (p: string) => void }) {
  const [files, setFiles] = useState<ComputerFile[]>([]);
  const [open, setOpen] = useState<{ path: string; content: string } | null>(null);
  const [err, setErr] = useState("");

  const load = async (p: string) => {
    setErr("");
    const res = await fetch(`/api/computer?op=list&path=${encodeURIComponent(p)}`);
    const data = await res.json();
    if (data.error) {
      setErr(data.error);
      setFiles([]);
    } else {
      setFiles(data.files || []);
      if (p.match(/\.[A-Za-z0-9]+$/)) {
        const parent = p.replace(/\/[^/]+$/, "") || "/workspace";
        if (parent !== p) onCwd(parent);
      }
    }
  };

  useEffect(() => {
    void load(cwd || "/workspace");
  }, [cwd]);

  const parent = (cwd || "/workspace").replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/workspace";

  return (
    <div className="win h-full">
      <div className="win-bar">
        <button className="icon-btn" onClick={() => onCwd(parent)}>
          <ArrowLeft size={14} />
        </button>
        <div className="truncate font-mono text-[12px] text-[var(--muted)]">{cwd || "/workspace"}</div>
        <button className="icon-btn ml-auto" onClick={() => load(cwd)}>
          <RotateCw size={13} />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="overflow-auto border-r border-[var(--line)] p-1">
          {err && <div className="px-3 py-2 text-[12px] text-danger">{err}</div>}
          {files.map((f) => (
            <button
              key={f.path}
              className="bot-row"
              onClick={async () => {
                if (f.type === "dir") {
                  setOpen(null);
                  onCwd(f.path);
                } else {
                  const res = await fetch(`/api/computer?op=read&path=${encodeURIComponent(f.path)}`);
                  const data = await res.json();
                  setOpen({ path: f.path, content: data.content || data.error || "" });
                }
              }}
            >
              <div className="flex items-center justify-between text-[13px]">
                <span>
                  {f.type === "dir" ? "📁" : "📄"} {f.name}
                </span>
                {f.size != null && <span className="text-[11px] text-[var(--dim)]">{f.size} B</span>}
              </div>
            </button>
          ))}
        </div>
        <pre className="overflow-auto p-4 font-mono text-[12px] leading-relaxed text-[var(--muted)]">
          {open ? open.content : "Select a file"}
        </pre>
      </div>
    </div>
  );
}

function Browser({ state, onState }: { state: ComputerState; onState: (s: Partial<ComputerState>) => void }) {
  const [url, setUrl] = useState(state.url || "https://x.ai/bot");
  useEffect(() => {
    if (state.url) setUrl(state.url);
  }, [state.url]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const go = async (target = url) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/computer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "browse", url: target }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setError(data.error);
      return;
    }
    onState({
      url: data.url,
      pageTitle: data.title,
      pageText: data.text,
    });
    setUrl(data.url);
  };

  return (
    <div className="win h-full">
      <div className="win-bar">
        <ArrowLeft size={13} className="text-[var(--dim)]" />
        <ArrowRight size={13} className="text-[var(--dim)]" />
        <form
          className="ml-1 flex min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            void go();
          }}
        >
          <input
            className="field h-7 text-[12px]"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="https://"
          />
        </form>
        <button className="icon-btn" onClick={() => void go()}>
          <RotateCw size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        {loading && <div className="text-[13px] text-[var(--muted)]">Loading…</div>}
        {error && <div className="text-[13px] text-danger">{error}</div>}
        {!loading && state.pageTitle && (
          <>
            <div className="text-[18px] font-semibold tracking-[-0.03em]">{state.pageTitle}</div>
            <div className="mt-1 text-[11px] text-[var(--dim)]">{state.url}</div>
            <p className="mt-4 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--muted)]">
              {state.pageText}
            </p>
          </>
        )}
        {!loading && !state.pageTitle && !error && (
          <div className="text-[13px] text-[var(--muted)]">Enter a URL. Bots can also open pages from chat.</div>
        )}
      </div>
    </div>
  );
}

function Term({ state, onState }: { state: ComputerState; onState: (s: Partial<ComputerState>) => void }) {
  const [cmd, setCmd] = useState("");
  const [lines, setLines] = useState(state.termLines || []);

  const run = async () => {
    const command = cmd.trim();
    if (!command) return;
    setCmd("");
    const next = [...lines, { kind: "in" as const, text: `$ ${command}` }];
    setLines(next);
    const res = await fetch("/api/computer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "exec", command }),
    });
    const data = await res.json();
    const out = (data.stdout || "") + (data.stderr ? (data.stdout ? "\n" : "") + data.stderr : "");
    setLines([...next, { kind: data.code ? "err" : "out", text: out || `(exit ${data.code})` }]);
    onState({ lastCommand: command, lastOutput: out, termLines: [...next, { kind: "out", text: out }] });
  };

  return (
    <div className="win h-full bg-[#0b0b0c] text-[#d7d7db]">
      <div className="win-bar">
        <span className="font-mono text-[12px]">zsh — workspace</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "err" ? "text-[#ff8d8d]" : l.kind === "in" ? "text-[#9be7c4]" : ""}>
            <pre className="whitespace-pre-wrap font-mono">{l.text}</pre>
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2 border-t border-white/10 px-3 py-2 font-mono text-[12.5px]"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <span className="text-[#9be7c4]">$</span>
        <input
          className="w-full bg-transparent outline-none"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="ls"
          autoFocus
        />
      </form>
    </div>
  );
}
