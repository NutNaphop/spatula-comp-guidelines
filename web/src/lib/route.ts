"use client";

import { useSyncExternalStore } from "react";

/**
 * Which screen is open, kept in the URL rather than in React state.
 *
 * Three things need it there. The Android shell opens the tracked comp by
 * loading `?comp=<id>`, so the detail view has to be reachable by URL. The
 * back gesture has to close what it opened instead of leaving the app, which
 * means each screen is a history entry. And the collapsed overlay window is
 * the same export loaded with `?view=mini`, so the strip is a route too.
 *
 * The URL is an external store, so it is read through useSyncExternalStore -
 * copying it into state on mount would render the wrong screen for a frame
 * and lose the deep link on a reload.
 */
export interface Route {
  /** the collapsed overlay window: renders the strip, not the browser */
  mini: boolean;
  /** comp being read */
  comp: string | null;
  /** comp being edited, or "new" for one that does not exist yet */
  edit: string | null;
}

export const NEW = "new";

const BROWSE: Route = { mini: false, comp: null, edit: null };

const listeners = new Set<() => void>();

/** Must be referentially stable between navigations or React loops. */
let cachedSearch: string | null = null;
let cached: Route = BROWSE;

function getSnapshot(): Route {
  const search = window.location.search;
  if (search !== cachedSearch) {
    cachedSearch = search;
    const p = new URLSearchParams(search);
    cached = {
      mini: p.get("view") === "mini",
      comp: p.get("comp"),
      edit: p.get("edit"),
    };
  }
  return cached;
}

/** The prerender cannot know the URL it will be served at. */
function getServerSnapshot(): Route {
  return BROWSE;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // pushState does not fire popstate, so our own navigations go through emit
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function emit() {
  for (const l of listeners) l();
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

type Patch = Partial<Record<"comp" | "edit", string | null>>;

function url(patch: Patch): string {
  const p = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) p.delete(key);
    else p.set(key, value);
  }
  const qs = p.toString();
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

/** Marks the entries we pushed, so [closeTop] can tell "go back" from
 * "this window was opened straight at a comp and there is nothing behind". */
const MARK = { spatula: true };

function push(patch: Patch) {
  history.pushState(MARK, "", url(patch));
  emit();
}

export function openComp(id: string) {
  push({ comp: id, edit: null });
}

export function openEditor(id: string) {
  push({ edit: id, comp: null });
}

/**
 * Land on a comp without leaving a way back to the screen that opened it -
 * what saving an edit wants, since the editor has nothing left to return to.
 * Passing null goes to the list, which is where deleting ends up.
 */
export function replaceComp(id: string | null) {
  history.replaceState(MARK, "", url({ comp: id, edit: null }));
  emit();
}

/**
 * Close the top screen. Going back is right when we pushed the entry, but the
 * overlay deep-links straight to a comp, and going back from there would
 * leave the page blank - so that case rewrites the URL to the list instead.
 */
export function closeTop() {
  if ((history.state as { spatula?: boolean } | null)?.spatula) {
    history.back();
    return;
  }
  history.replaceState(null, "", url({ comp: null, edit: null }));
  emit();
}
