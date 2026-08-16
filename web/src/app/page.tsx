"use client";

import { useEffect, useMemo, useState } from "react";
import { CompCard } from "@/components/CompCard";
import { CompDetail } from "@/components/CompDetail";
import { FilterState, Filters } from "@/components/Filters";
import { PinsBackup } from "@/components/PinsBackup";
import { applyFilters } from "@/lib/comps";
import { usePins } from "@/lib/pins";
import { useArtifact } from "@/lib/useArtifact";

export default function Home() {
  const state = useArtifact();
  const { pins, toggle, reload } = usePins();

  const [filters, setFilters] = useState<FilterState>({
    query: "",
    tiers: new Set(),
    tags: new Set(),
    pinnedOnly: false,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);

  const data = state.status === "ready" ? state.data : null;

  const visible = useMemo(
    () => (data ? applyFilters(data, filters, pins) : []),
    [data, filters, pins],
  );

  const open = data?.comps.find((c) => c.id === openId) ?? null;

  // hardware back / swipe back closes the detail instead of leaving the app
  useEffect(() => {
    if (!openId) return;
    history.pushState({ detail: openId }, "");
    const onPop = () => setOpenId(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [openId]);

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
    }));

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
              onOpen={() => setOpenId(comp.id)}
              onTogglePin={() => toggle(comp.id)}
            />
          ))}

        {data && visible.length === 0 && (
          <Notice>
            {filters.pinnedOnly
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
            สำรองหมุด
          </button>
        </footer>
      )}

      {backupOpen && (
        <PinsBackup onDone={() => setBackupOpen(false)} onRestored={reload} />
      )}

      {open && data && (
        <CompDetail
          key={open.id}
          comp={open}
          data={data}
          pinned={pins.has(open.id)}
          onTogglePin={() => toggle(open.id)}
          onClose={() => history.back()}
        />
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="col-span-full px-3 py-16 text-center text-sm text-mute">{children}</p>;
}
