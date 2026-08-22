"use client";

import { useEffect, useMemo, useState } from "react";
import { Backup } from "@/components/Backup";
import { CompCard } from "@/components/CompCard";
import { CompDetail } from "@/components/CompDetail";
import { CompEditor } from "@/components/CompEditor";
import { FilterState, Filters } from "@/components/Filters";
import { MiniStrip } from "@/components/MiniStrip";
import { useActiveComp } from "@/lib/active";
import { applyFilters } from "@/lib/comps";
import { blankComp, copyOf, useMyComps, withMine } from "@/lib/mycomps";
import { usePins } from "@/lib/pins";
import {
  NEW,
  Route,
  closeTop,
  openComp,
  openEditor,
  replaceComp,
  useRoute,
} from "@/lib/route";
import { Comp, isMine } from "@/lib/types";
import { useArtifact } from "@/lib/useArtifact";

export default function Home() {
  // the collapsed overlay window loads the same export with ?view=mini, so
  // both windows share one origin and therefore one localStorage
  const route = useRoute();
  if (route.mini) return <MiniStrip />;
  return <Browser route={route} />;
}

function Browser({ route }: { route: Route }) {
  const state = useArtifact();
  const { active, track } = useActiveComp();
  const { pins, toggle, reload } = usePins();
  const { mine, save, remove, reload: reloadMine } = useMyComps();

  const [filters, setFilters] = useState<FilterState>({
    query: "",
    tiers: new Set(),
    tags: new Set(),
    pinnedOnly: false,
    mineOnly: false,
  });
  const [backupOpen, setBackupOpen] = useState(false);
  /** a copy of a published comp, not yet saved anywhere */
  const [pending, setPending] = useState<Comp | null>(null);

  // own comps are merged into the artifact rather than kept beside it, so
  // every list, card and board below treats them as ordinary comps
  const data = useMemo(
    () => (state.status === "ready" ? withMine(state.data, mine) : null),
    [state, mine],
  );

  const visible = useMemo(
    () => (data ? applyFilters(data, filters, pins) : []),
    [data, filters, pins],
  );

  const open = route.comp ? (data?.comps.find((c) => c.id === route.comp) ?? null) : null;

  // a fresh blank per visit to the editor, so an abandoned draft is not
  // reopened next time
  const blank = useMemo(() => (route.edit === NEW ? blankComp() : null), [route.edit]);
  const draft = !route.edit
    ? null
    : route.edit === NEW
      ? (pending ?? blank)
      : (mine.find((c) => c.id === route.edit) ?? null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }, []);

  const update = (next: Partial<FilterState>) =>
    setFilters((prev) => ({ ...prev, ...next }));

  // functional so two chips tapped in the same tick both register
  const toggleFacet = (facet: "tiers" | "tags", id: string) =>
    setFilters((prev) => {
      const next = new Set(prev[facet]);
      if (!next.delete(id)) next.add(id);
      return { ...prev, [facet]: next };
    });

  const clearFilters = () =>
    setFilters((prev) => ({
      ...prev,
      tiers: new Set(),
      tags: new Set(),
      pinnedOnly: false,
      mineOnly: false,
    }));

  const create = () => {
    setPending(null);
    openEditor(NEW);
  };

  /**
   * Keep a published comp without editing it. It lands on the copy rather
   * than staying put, so the save is visibly a thing that happened and the
   * comp you are now looking at is the one you own - back returns to the
   * published one.
   */
  const saveCopy = (comp: Comp) => {
    const copy = copyOf(comp);
    save(copy);
    openComp(copy.id);
  };

  /** Editing a published comp edits a copy of it - the artifact is rebuilt
   * by the refresh job and would overwrite anything written back into it. */
  const edit = (comp: Comp) => {
    if (isMine(comp.id)) {
      openEditor(comp.id);
      return;
    }
    setPending(copyOf(comp));
    openEditor(NEW);
  };

  const saveComp = (comp: Comp) => {
    save(comp);
    setPending(null);
    // replaces the editor's entry: there is nothing to go back to once saved
    replaceComp(comp.id);
  };

  const deleteComp = (id: string) => {
    remove(id);
    setPending(null);
    if (active === id) track(id); // stop the overlay tracking a comp that is gone
    replaceComp(null);
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-edge bg-ink/95 px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur">
        {data ? (
          <Filters
            data={data}
            state={filters}
            onChange={update}
            onToggle={toggleFacet}
            onClear={clearFilters}
            onCreate={create}
            resultCount={visible.length}
          />
        ) : (
          <div className="h-10" />
        )}
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-1.5 p-3 sm:max-w-3xl sm:grid sm:grid-cols-2 sm:items-start">
        {state.status === "loading" && <Notice>กำลังโหลด</Notice>}
        {state.status === "error" && <Notice>{state.message}</Notice>}

        {data &&
          visible.map((comp) => (
            <CompCard
              key={comp.id}
              comp={comp}
              data={data}
              pinned={pins.has(comp.id)}
              onOpen={() => openComp(comp.id)}
              onTogglePin={() => toggle(comp.id)}
            />
          ))}

        {data && visible.length === 0 && (
          <Notice>
            {filters.mineOnly
              ? "ยังไม่มีคอมพ์ของคุณเอง — กด + เพื่อสร้าง"
              : filters.pinnedOnly
                ? "ยังไม่มีคอมพ์ที่ปักหมุด — กดดาวที่คอมพ์เพื่อเก็บไว้"
                : "ไม่มีคอมพ์ที่ตรงกับตัวกรองนี้"}
          </Notice>
        )}
      </main>

      {data && (
        <footer className="label flex items-center justify-center gap-3 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <span>
            {data.meta.version}-{data.meta.season} · {data.meta.comp_count} คอมพ์ ·{" "}
            {data.meta.source_time?.slice(0, 10)}
          </span>
          <button
            type="button"
            onClick={() => setBackupOpen(true)}
            className="label underline decoration-edge underline-offset-2 hover:text-chalk"
          >
            สำรองข้อมูล
          </button>
        </footer>
      )}

      {backupOpen && (
        <Backup
          onDone={() => setBackupOpen(false)}
          onRestored={() => {
            reload();
            reloadMine();
          }}
        />
      )}

      {open && data && !draft && (
        <CompDetail
          key={open.id}
          comp={open}
          data={data}
          pinned={pins.has(open.id)}
          onTogglePin={() => toggle(open.id)}
          tracked={active === open.id}
          onToggleTrack={() => track(open.id)}
          mine={isMine(open.id)}
          onSaveCopy={() => saveCopy(open)}
          onEdit={() => edit(open)}
          onClose={closeTop}
        />
      )}

      {draft && data && (
        <CompEditor
          key={draft.id}
          draft={draft}
          data={data}
          existing={mine.some((c) => c.id === draft.id)}
          onSave={saveComp}
          onDelete={() => deleteComp(draft.id)}
          onClose={closeTop}
        />
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="col-span-full px-3 py-16 text-center text-sm text-mute">{children}</p>;
}
