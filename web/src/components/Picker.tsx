"use client";

import { useMemo, useState } from "react";
import { Artifact, costVar } from "@/lib/types";

/** A bottom sheet with a search box and a grid. Champions and items are both
 * "pick one of a few hundred things by sight", so they share it. */
function Sheet({
  title,
  query,
  onQuery,
  onClose,
  children,
}: {
  title: string;
  query: string;
  onQuery: (q: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/80 sm:items-center sm:justify-center">
      <div className="sheet flex max-h-[80dvh] w-full flex-col rounded-t-xl bg-slate sm:max-w-md sm:rounded-xl">
        <div className="flex items-center gap-2 p-3">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={title}
            className="min-w-0 flex-1 rounded-md bg-ink px-3 py-2 text-[15px] outline-none placeholder:text-mute/70 focus:ring-1 focus:ring-edge"
          />
          <button type="button" onClick={onClose} className="label px-1 hover:text-chalk">
            ปิด
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function HeroPicker({
  data,
  onPick,
  onClose,
}: {
  data: Artifact;
  onPick: (heroId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  // shop order: cheap first, then alphabetical, so the list sits still
  // between openings and the eye learns where things are
  const heroes = useMemo(
    () =>
      Object.entries(data.heroes).sort(
        ([, a], [, b]) => a.cost - b.cost || a.name.localeCompare(b.name),
      ),
    [data.heroes],
  );

  const q = query.trim().toLowerCase();
  const hits = heroes.filter(
    ([, h]) =>
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.traits.some((t) => t.toLowerCase().includes(q)),
  );

  return (
    <Sheet title="ชื่อแชมป์ หรือ สายพลัง" query={query} onQuery={setQuery} onClose={onClose}>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
        {hits.map(([id, hero]) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className="flex flex-col items-center gap-1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.icon}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded border-2 object-cover"
              style={{ borderColor: costVar(hero.cost) }}
            />
            <span className="w-full truncate text-center text-[10px] text-mute">
              {hero.name}
            </span>
          </button>
        ))}
        {hits.length === 0 && <Empty>ไม่พบแชมป์</Empty>}
      </div>
    </Sheet>
  );
}

export function ItemPicker({
  data,
  onPick,
  onClose,
}: {
  data: Artifact;
  onPick: (itemId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const items = useMemo(
    () => Object.entries(data.items).sort(([, a], [, b]) => a.name.localeCompare(b.name)),
    [data.items],
  );

  const q = query.trim().toLowerCase();
  const hits = items.filter(([, it]) => !q || it.name.toLowerCase().includes(q));

  return (
    <Sheet title="ชื่อไอเทม" query={query} onQuery={setQuery} onClose={onClose}>
      <ul className="flex flex-col">
        {hits.map(([id, item]) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              className="flex w-full items-center gap-3 border-b border-edge/60 py-2 text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.icon}
                alt=""
                loading="lazy"
                className="h-7 w-7 flex-none rounded"
              />
              <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
            </button>
          </li>
        ))}
        {hits.length === 0 && <Empty>ไม่พบไอเทม</Empty>}
      </ul>
    </Sheet>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="col-span-full py-10 text-center text-sm text-mute">{children}</p>;
}
