"use client";

import { useEffect, useState } from "react";
import { Artifact, Comp, costVar, tierVar } from "@/lib/types";
import { displayOrder, sortedLevels } from "@/lib/comps";
import { Board } from "./Board";
import { PinButton } from "./PinButton";

export function CompDetail({
  comp,
  data,
  pinned,
  onTogglePin,
  onClose,
}: {
  comp: Comp;
  data: Artifact;
  pinned: boolean;
  onTogglePin: () => void;
  onClose: () => void;
}) {
  const levels = sortedLevels(comp);
  const [level, setLevel] = useState(String(comp.final_level));
  const units = comp.levels[level] ?? [];

  useEffect(() => setLevel(String(comp.final_level)), [comp]);

  const notes = (
    [
      ["ต้นเกม", comp.notes.early],
      ["การวางตำแหน่ง", comp.notes.positioning],
      ["ไอเทม", comp.notes.items],
      ["Hex", comp.notes.hex],
    ] as const
  ).filter(([, v]) => v && v.trim());

  return (
    <div className="sheet fixed inset-0 z-20 overflow-y-auto bg-ink pb-10">
      <div className="mx-auto max-w-xl px-3">
        <div className="sticky top-0 -mx-3 flex items-center justify-between bg-ink/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
          <button type="button" onClick={onClose} className="label py-1 hover:text-chalk">
            ← กลับ
          </button>
          <PinButton pinned={pinned} onClick={onTogglePin} large />
        </div>

        <div className="flex items-baseline gap-2 pt-1">
          <span className="label" style={{ color: tierVar(comp.tier) }}>
            {comp.tier ?? "—"}
          </span>
          <h1 className="text-xl font-bold tracking-tight">{comp.name}</h1>
        </div>
        <p className="label mt-1">
          {[...comp.tags.map((t) => data.tags[t]).filter(Boolean), comp.author]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {/* the board is the hero: first thing on screen, biggest thing on it */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="label">กระดาน</span>
            {levels.length > 1 && (
              <div className="rail flex gap-1 overflow-x-auto">
                {levels.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    aria-pressed={lv === level}
                    className={`label flex-none rounded px-2 py-1 transition-colors ${
                      lv === level ? "bg-edge text-chalk" : "hover:text-chalk"
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Board units={units} data={data} />
        </div>

        <Section label="ยูนิต">
          <ul className="flex flex-col">
            {displayOrder(units, data).map((u, i) => {
              const hero = data.heroes[u.hero];
              if (!hero) return null;
              return (
                <li
                  key={`${u.hero}-${i}`}
                  className="flex items-center gap-3 border-b border-edge/60 py-2 last:border-0"
                >
                  <span
                    aria-hidden
                    className="font-mono text-xs tabular-nums"
                    style={{ color: costVar(hero.cost) }}
                  >
                    {hero.cost}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={u.carry ? "font-semibold text-cost-5" : "font-medium"}>
                      {hero.name}
                    </span>
                    {u.star > 1 && (
                      <span className="ml-1 font-mono text-[10px] text-cost-5">
                        {"★".repeat(u.star)}
                      </span>
                    )}
                    <span className="block truncate text-xs text-mute">
                      {hero.traits.join(" · ")}
                    </span>
                  </span>
                  <span className="flex flex-none gap-1">
                    {u.items.map((id, j) => {
                      const item = data.items[id];
                      if (!item) return null;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${id}-${j}`}
                          src={item.icon}
                          alt={item.name}
                          title={`${item.name}\n${item.desc ?? ""}`}
                          loading="lazy"
                          className="h-6 w-6 rounded"
                        />
                      );
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        <HexSection label="Hex แนะนำ" ids={comp.hexes.recommended} data={data} />
        <HexSection label="Hex สำรอง" ids={comp.hexes.alternatives} data={data} muted />

        {comp.gods.length > 0 && (
          <Section label="เทพ">
            <ul className="flex flex-col">
              {comp.gods.map((g, i) => {
                const god = data.gods[g.god];
                if (!god) return null;
                return (
                  <li
                    key={`${g.god}-${i}`}
                    className="flex items-center gap-3 border-b border-edge/60 py-2 last:border-0"
                  >
                    <span className="label w-10 flex-none">ST {g.stage}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={god.icon}
                      alt=""
                      loading="lazy"
                      className="h-6 w-6 flex-none rounded"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{god.name}</span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {notes.map(([label, text]) => (
          <Section key={label} label={label}>
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-chalk/85">
              {text}
            </p>
          </Section>
        ))}

        <p className="label mt-8">
          {comp.released?.slice(0, 10) ?? "—"} · patch {comp.patch}
        </p>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="label mb-2">{label}</h2>
      {children}
    </section>
  );
}

function HexSection({
  label,
  ids,
  data,
  muted = false,
}: {
  label: string;
  ids: string[];
  data: Artifact;
  muted?: boolean;
}) {
  if (!ids.length) return null;
  return (
    <Section label={label}>
      <ul className="flex flex-col">
        {ids.map((id) => {
          const hex = data.hexes[id];
          if (!hex) return null;
          return (
            <li key={id} className="flex gap-3 border-b border-edge/60 py-2 last:border-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hex.icon}
                alt=""
                loading="lazy"
                className={`h-7 w-7 flex-none rounded ${muted ? "opacity-60" : ""}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{hex.name}</p>
                {hex.desc && (
                  <p className="mt-0.5 text-xs leading-relaxed text-mute">{hex.desc}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
