"use client";

import { DEFAULT_SKILLS } from "./defaults";
import { catalogAsPlugins } from "./plugins";
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
      activeProvider: "xai",
      activeModel: "grok-4.6",
    },
    chats: [],
    activeId: null,
    pinnedIds: [],
    skills: DEFAULT_SKILLS,
    plugins: catalogAsPlugins(),
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
      plugins: catalogAsPlugins(parsed.plugins || []),
    };
  } catch {
    return emptyPersist();
  }
}

export function savePersist(data: PersistShape) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
