"use client";

import { useEffect, useMemo, useState } from "react";
import { CompCard } from "@/components/CompCard";
import { CompDetail } from "@/components/CompDetail";
import { matchesQuery } from "@/lib/comps";
import { usePins } from "@/lib/pins";
import { useArtifact } from "@/lib/useArtifact";

export default function Home() {
  const state = useArtifact();
  const { pins, toggle } = usePins();

  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<string | null>(null);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const data = state.status === "ready" ? state.data : null;

  const tiers = useMemo(
    () =>
      data
        ? [...new Set(data.comps.map((c) => c.tier).filter((t): t is string => !!t))].sort()
        : [],
    [data],
  );

  // pinned float to the top: the whole point is fast access to your own list
  const visible = useMemo(() => {
    if (!data) return [];
    const hits = data.comps.filter(
      (c) =>
        (!pinnedOnly || pins.has(c.id)) &&
        (!tier || c.tier === tier) &&
        matchesQuery(c, query, data),
    );
    return [
      ...hits.filter((c) => pins.has(c.id)),
      ...hits.filter((c) => !pins.has(c.id)),
    ];
  }, [data, pins, pinnedOnly, tier, query]);

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

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 flex flex-col gap-2 border-b border-neutral-800 bg-neutral-950 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาคอมพ์ / แชมป์..."
            className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none placeholder:text-neutral-500 focus:border-neutral-600"
          />
          <button
            type="button"
            aria-pressed={pinnedOnly}
            onClick={() => setPinnedOnly((v) => !v)}
            title="เฉพาะที่ปักหมุด"
            className={`flex-none rounded-lg border px-3 ${
              pinnedOnly
                ? "border-amber-300 bg-amber-300 text-neutral-900"
                : "border-neutral-800 bg-neutral-900 text-neutral-300"
            }`}
          >
            ★
          </button>
        </div>

        {tiers.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto">
            <FilterChip active={tier === null} onClick={() => setTier(null)}>
              ทั้งหมด
            </FilterChip>
            {tiers.map((t) => (
              <FilterChip key={t} active={tier === t} onClick={() => setTier(t)}>
                Tier {t}
              </FilterChip>
            ))}
          </div>
        )}
      </header>

      <main className="flex flex-col gap-2 p-2 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        {state.status === "loading" && <Notice>กำลังโหลด...</Notice>}
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
            {pinnedOnly
              ? "ยังไม่ได้ปักหมุดคอมพ์ไหน — กด ★ ที่คอมพ์ที่ชอบ"
              : "ไม่พบคอมพ์ที่ตรงกับที่ค้นหา"}
          </Notice>
        )}
      </main>

      {data && (
        <footer className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-neutral-500">
          patch {data.meta.version}-{data.meta.season} · {data.meta.comp_count} คอมพ์ ·
          อัปเดต {data.meta.source_time?.slice(0, 10)}
        </footer>
      )}

      {open && data && (
        <CompDetail
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-none whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm ${
        active
          ? "border-amber-300 bg-amber-300 text-neutral-900"
          : "border-neutral-800 bg-neutral-900 text-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="col-span-full px-3 py-8 text-center text-neutral-400">{children}</p>
  );
}
