"use client";

import { useState } from "react";
import { BOT_TEMPLATES, type BotTemplate } from "@/lib/defaults";

export function Onboarding({
  onDone,
}: {
  onDone: (picked: BotTemplate[], custom?: { name: string; title: string; description: string }) => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [picked, setPicked] = useState<string[]>(["grok"]);
  const [custom, setCustom] = useState({ name: "", title: "", description: "" });

  const toggle = (key: string) => {
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-16">
        {step === 0 && (
          <div className="mx-auto max-w-xl text-center">
            <div className="kicker">Early beta · open source</div>
            <h1 className="mt-3 text-[52px] font-semibold leading-[1.02] tracking-[-0.045em]">Meet your teammates</h1>
            <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-[var(--muted)]">
              AI teammates you can give real work to. They share a computer of their own — files, a browser, a
              terminal — and only come back when something needs you.
            </p>
            <button
              className="mt-10 h-11 rounded-full bg-[var(--text)] px-6 text-[14px] font-medium text-[var(--invert)]"
              onClick={() => setStep(1)}
            >
              Meet a future teammate
            </button>
            <p className="mt-5 text-[12px] text-[var(--dim)]">Your computer, your keys. Independent open-source software.</p>
          </div>
        )}

        {step === 1 && (
          <>
            <div className="mb-8">
              <div className="kicker">Step 2</div>
              <h2 className="mt-2 text-[32px] font-semibold tracking-[-0.04em]">Give each Bot a job</h2>
              <p className="mt-2 max-w-xl text-[14px] text-[var(--muted)]">
                Focused Bots keep better context than one catch-all. Pick a few to start — you can always add more.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BOT_TEMPLATES.map((t) => {
                const on = picked.includes(t.key);
                return (
                  <button key={t.key} className={`suggest ${on ? "picked" : ""}`} onClick={() => toggle(t.key)}>
                    <div className="row">
                      <img src={t.avatar} alt="" className="avatar" />
                      <div className="min-w-0 text-left">
                        <div className="text-[14px] font-medium">{t.name}</div>
                        <div className="text-[12px] text-[var(--muted)]">{t.title}</div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-left text-[12.5px] leading-relaxed text-[var(--muted)]">
                      {t.description}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <button className="text-[13px] text-[var(--muted)]" onClick={() => setStep(2)}>
                Create your own
              </button>
              <button
                disabled={!picked.length}
                className="h-10 rounded-full bg-[var(--text)] px-5 text-[13px] font-medium text-[var(--invert)] disabled:opacity-40"
                onClick={() => onDone(BOT_TEMPLATES.filter((t) => picked.includes(t.key)))}
              >
                Start with {picked.length} Bot{picked.length === 1 ? "" : "s"}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="mx-auto w-full max-w-lg">
            <div className="kicker">Create your own</div>
            <h2 className="mt-2 text-[32px] font-semibold tracking-[-0.04em]">Name the job</h2>
            <p className="mt-2 text-[14px] text-[var(--muted)]">A short name, one primary job, and the rules that should stay true.</p>
            <div className="mt-6 space-y-3">
              <input
                className="field"
                placeholder="Name — Piper"
                value={custom.name}
                onChange={(e) => setCustom({ ...custom, name: e.target.value })}
              />
              <input
                className="field"
                placeholder="Job — Product performance"
                value={custom.title}
                onChange={(e) => setCustom({ ...custom, title: e.target.value })}
              />
              <textarea
                className="field min-h-[120px]"
                placeholder="Investigate product-performance questions… Never change production settings."
                value={custom.description}
                onChange={(e) => setCustom({ ...custom, description: e.target.value })}
              />
            </div>
            <div className="mt-8 flex justify-between">
              <button className="text-[13px] text-[var(--muted)]" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="h-10 rounded-full bg-[var(--text)] px-5 text-[13px] font-medium text-[var(--invert)] disabled:opacity-40"
                disabled={!custom.name.trim() || !custom.title.trim()}
                onClick={() => onDone([], custom)}
              >
                Create Bot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
