"use client";

import { DEFAULT_PLUGINS, DEFAULT_SKILLS } from "./defaults";
import type { PersistShape } from "./types";

const KEY = "grok-bot-v1";

export function emptyPersist(): PersistShape {
  return {
    version: 1,
    onboarded: false,
    settings: {
      theme: "dark",
      accountName: "You",
      apiKeyConfigured: false,
      updateTrack: "stable",
    },
    chats: [],
    activeId: null,
    pinnedIds: [],
    skills: DEFAULT_SKILLS,
    plugins: DEFAULT_PLUGINS,
  };
}

export function loadPersist(): PersistShape {
  if (typeof window === "undefined") return emptyPersist();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPersist();
    const parsed = JSON.parse(raw) as PersistShape;
    if (parsed.version !== 1) return emptyPersist();
    return {
      ...emptyPersist(),
      ...parsed,
      settings: { ...emptyPersist().settings, ...parsed.settings },
    };
  } catch {
    return emptyPersist();
  }
}

export function savePersist(data: PersistShape) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
