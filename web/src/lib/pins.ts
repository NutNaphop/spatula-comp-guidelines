"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "spatula.pinned.v1";

/** Pinned comps live only on the device - this is the feature the game caps
 * at three, so there is deliberately no limit and no account behind it.
 *
 * localStorage is an external store, so it is read through
 * useSyncExternalStore rather than copied into state on mount: that keeps
 * the server render and the first client render agreeing, and lets a restore
 * from backup or another tab push straight through.
 *
 * iOS can evict web storage for sites that go unused, which is what
 * exportPins/importPins exist for. */

const EMPTY: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedSet: ReadonlySet<string> = EMPTY;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // another tab, or the same app in a second window
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function emit() {
  for (const l of listeners) l();
}

/** Must be referentially stable between writes or React re-renders forever. */
function getSnapshot(): ReadonlySet<string> {
  const raw = rawValue();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSet = new Set(parse(raw));
  }
  return cachedSet;
}

function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

export function usePins() {
  const pins = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((id: string) => {
    const next = new Set(getSnapshot());
    if (!next.delete(id)) next.add(id);
    write(next);
    emit();
  }, []);

  /** Re-read after something outside React wrote, such as a restore. */
  const reload = useCallback(() => emit(), []);

  return { pins, toggle, reload };
}

function rawValue(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function read(): string[] {
  return parse(rawValue());
}

function write(pins: Iterable<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...pins]));
  } catch {
    // storage full or blocked - the UI stays usable, the pin just is not kept
  }
}

export function exportPins(): string {
  return JSON.stringify(read());
}

export function importPins(json: string): number {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
  const ids = parsed.filter((x): x is string => typeof x === "string");
  write(new Set([...read(), ...ids]));
  return ids.length;
}
