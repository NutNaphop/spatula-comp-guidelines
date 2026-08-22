"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Artifact, Comp, MY_PREFIX, Unit, isMine } from "./types";
import { finalUnits } from "./comps";

const KEY = "spatula.mycomps.v1";

/**
 * Comps the player built themselves.
 *
 * They are stored in the artifact's own Comp shape and merged into the comp
 * list by [withMine], so the cards, the detail view, the board, the pins and
 * the overlay strip all render them with no idea they came from localStorage.
 * The alternative - a parallel "custom comp" type - would mean a second
 * version of every one of those.
 *
 * Same store pattern as pins: localStorage is external, so it is read through
 * useSyncExternalStore rather than mirrored into state.
 */

const EMPTY: readonly Comp[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedList: readonly Comp[] = EMPTY;

function rawValue(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Anything that is not a comp we could render is dropped rather than
 * allowed to crash the list: this file can be pasted in by hand from a
 * backup. */
function parse(raw: string | null): Comp[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isUsableComp);
}

export function isUsableComp(value: unknown): value is Comp {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<Comp>;
  return (
    typeof c.id === "string" &&
    isMine(c.id) &&
    typeof c.name === "string" &&
    typeof c.levels === "object" &&
    c.levels !== null
  );
}

/** Must be referentially stable between writes or React re-renders forever. */
function getSnapshot(): readonly Comp[] {
  const raw = rawValue();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

function getServerSnapshot(): readonly Comp[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function emit() {
  for (const l of listeners) l();
}

function write(comps: readonly Comp[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(comps));
  } catch {
    // storage full or blocked - the edit stays on screen, it just is not kept
  }
}

export function useMyComps() {
  const mine = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const save = useCallback((comp: Comp) => {
    const normalised = normalise(comp);
    const rest = getSnapshot().filter((c) => c.id !== normalised.id);
    // newest first: the comp you just edited is the one you are about to use
    write([normalised, ...rest]);
    emit();
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((c) => c.id !== id));
    emit();
  }, []);

  /** Re-read after something outside React wrote, such as a restore. */
  const reload = useCallback(() => emit(), []);

  return { mine, save, remove, reload };
}

/**
 * The level a comp is written for is just how many units are on the board,
 * which is one fewer thing to fill in and one fewer way to end up with a comp
 * whose board is stored under a level nothing reads.
 */
function normalise(comp: Comp): Comp {
  const units = finalUnits(comp);
  const level = Math.max(units.length, 1);
  return { ...comp, final_level: level, levels: { [String(level)]: units } };
}

function newId(): string {
  return `${MY_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** patch is filled in on save, from whatever artifact is loaded then. */
export function blankComp(): Comp {
  return {
    id: newId(),
    name: "",
    tier: null,
    author: null,
    tags: [],
    difficulty: null,
    released: new Date().toISOString(),
    patch: "",
    final_level: 1,
    levels: { "1": [] },
    hexes: { recommended: [], alternatives: [] },
    gods: [],
    notes: { early: null, positioning: null, items: null, hex: null, god: null },
  };
}

/**
 * Start from a published comp instead of an empty board. This is the common
 * case - a meta comp with two units swapped for what you actually hit - so it
 * keeps the board, the items and the notes and drops only what stops being
 * true once you edit it: the tier, the author and the tags.
 */
export function copyOf(comp: Comp): Comp {
  const units: Unit[] = finalUnits(comp).map((u) => ({ ...u, items: [...u.items] }));
  return {
    ...comp,
    id: newId(),
    name: comp.name,
    tier: null,
    author: null,
    tags: [],
    released: new Date().toISOString(),
    final_level: Math.max(units.length, 1),
    levels: { [String(Math.max(units.length, 1))]: units },
    hexes: {
      recommended: [...comp.hexes.recommended],
      alternatives: [...comp.hexes.alternatives],
    },
    gods: comp.gods.map((g) => ({ ...g, wishes: [...g.wishes] })),
    notes: { ...comp.notes },
  };
}

/** One comp list for the whole app, own comps first. */
export function withMine(data: Artifact, mine: readonly Comp[]): Artifact {
  if (!mine.length) return data;
  return { ...data, comps: [...mine, ...data.comps] };
}

export function exportMine(): Comp[] {
  return parse(rawValue());
}

/** Merges by id, so restoring a backup twice does not double the list. */
export function importMine(comps: unknown): number {
  if (!Array.isArray(comps)) return 0;
  const incoming = comps.filter(isUsableComp);
  if (!incoming.length) return 0;
  const byId = new Map(getSnapshot().map((c) => [c.id, c]));
  for (const c of incoming) byId.set(c.id, c);
  write([...byId.values()]);
  emit();
  return incoming.length;
}
