"use client";

import { useCallback, useEffect, useState } from "react";

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
 * Both overlay windows are the same origin, so the mini strip reads this out
 * of localStorage that the full panel wrote - no data crosses into native
 * code, and the strip's layout stays in one place.
 */
export function useActiveComp() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setActive(read());
    // the panel and the strip are separate WebViews: a write in one arrives
    // here as a storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setActive(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const track = useCallback((id: string | null) => {
    setActive((prev) => {
      const next = prev === id ? null : id;
      write(next);
      window.SpatulaHost?.onActiveComp?.(next);
      return next;
    });
  }, []);

  return { active, track };
}

export function read(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked - tracking just does not persist
  }
}
