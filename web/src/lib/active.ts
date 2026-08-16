"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "spatula.active.v1";

/** Notifies the Android shell that the tracked comp changed, so it can resize
 * the collapsed window between a small dot and a wide strip. Absent in a
 * plain browser, which is why every call is guarded. */
declare global {
  interface Window {
    SpatulaHost?: { onActiveComp?: (id: string | null) => void };
  }
}

/**
 * The comp the player is currently building.
 *
 * localStorage is an external store, so it is read through
 * useSyncExternalStore rather than mirrored into state from an effect: the
 * two overlay windows are separate documents sharing one origin, and this
 * keeps both of them showing the same answer without a render-then-correct
 * pass on every mount.
 */
let snapshot: string | null = readRaw();
const listeners = new Set<() => void>();

function readRaw(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function refresh() {
  const next = readRaw();
  if (next === snapshot) return;
  snapshot = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    // a write in the other window arrives as a storage event; focus covers
    // WebViews that deliver those unreliably
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    }
  };
}

const getSnapshot = () => snapshot;
/** Prerendered HTML cannot know what this device tracked. */
const getServerSnapshot = () => null;

export function useActiveComp() {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const track = useCallback((id: string | null) => {
    const next = snapshot === id ? null : id;
    write(next);
    snapshot = next;
    listeners.forEach((l) => l());
    window.SpatulaHost?.onActiveComp?.(next);
  }, []);

  return { active, track };
}

/** Read-only view, for the collapsed strip. */
export function useActiveCompId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function write(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked - tracking just does not persist
  }
}
