"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "spatula.pinned.v1";

/** Pinned comps live only on the device - this is the feature the game caps
 * at three, so there is deliberately no limit and no account behind it.
 *
 * iOS can evict web storage for sites that go unused, so exportPins() exists
 * as the manual backup hatch. */
export function usePins() {
  const [pins, setPins] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPins(new Set(read()));
    setReady(true);
  }, []);

  const toggle = useCallback((id: string) => {
    setPins((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      write(next);
      return next;
    });
  }, []);

  return { pins, toggle, ready };
}

function read(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(pins: Set<string>) {
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
