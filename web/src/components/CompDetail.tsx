"use client";

import { useEffect, useState } from "react";
import { Artifact, Comp, COST_BORDER } from "@/lib/types";
import { displayOrder, sortedLevels } from "@/lib/comps";
import { Board } from "./Board";

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
    <div className="fixed inset-0 z-20 overflow-y-auto bg-neutral-950 px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={onClose} className="py-1.5 text-neutral-400">
            ‹ กลับ
          </button>
          <button
            type="button"
            aria-pressed={pinned}
            onClick={onTogglePin}
            className={`px-1 text-xl ${pinned ? "text-amber-300" : "text-neutral-600"}`}
          >
            ★
          </button>
        </div>

        <h1 className="text-lg font-semibold">{comp.name}</h1>
        <p className="text-xs text-neutral-400">
          {[comp.tier && `Tier ${comp.tier}`, comp.author, ...comp.tags]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {levels.length > 1 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto">
            {levels.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={`flex-none rounded-lg border px-3 py-1 text-sm ${
                  lv === level
                    ? "border-amber-300 bg-amber-300 text-neutral-900"
                    : "border-neutral-800 bg-neutral-900 text-neutral-300"
                }`}
              >
                Lv {lv}
              </button>
            ))}
          </div>
        )}

        <Section title={`กระดาน — เลเวล ${level}`}>
          <Board units={units} data={data} />
        </Section>

        <Section title="ยูนิตและไอเทม">
          <div className="flex flex-col gap-1.5">
            {displayOrder(units, data).map((u, i) => {
              const hero = data.heroes[u.hero];
              if (!hero) return null;
              return (
                <div
                  key={`${u.hero}-${i}`}
                  className="flex items-center gap-2 rounded-lg bg-neutral-900 px-2 py-1.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hero.icon}
                    alt={hero.name}
                    loading="lazy"
                    className={`h-9 w-9 flex-none rounded-md border-2 object-cover ${
                      COST_BORDER[hero.cost] ?? COST_BORDER[0]
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <b className={u.carry ? "text-amber-300" : ""}>
                      {hero.name} {"★".repeat(u.star)}
                    </b>
                    <span className="block truncate text-[11px] text-neutral-400">
                      {hero.cost} · {hero.traits.join(" / ")}
                    </span>
                  </div>
                  <div className="flex flex-none gap-0.5">
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
                          className="h-5 w-5 rounded"
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <HexSection title="Hex แนะนำ" ids={comp.hexes.recommended} data={data} />
        <HexSection title="Hex สำรอง" ids={comp.hexes.alternatives} data={data} />

        {comp.gods.length > 0 && (
          <Section title="เทพ">
            <div className="flex flex-col gap-1.5">
              {comp.gods.map((g, i) => {
                const god = data.gods[g.god];
                if (!god) return null;
                return (
                  <div
                    key={`${g.god}-${i}`}
                    className="flex items-center gap-2 rounded-lg bg-neutral-900 px-2 py-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={god.icon}
                      alt={god.name}
                      loading="lazy"
                      className="h-7 w-7 flex-none rounded-md"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{god.name}</span>
                    <span className="flex-none text-xs text-neutral-500">
                      สเตจ {g.stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {notes.map(([label, text]) => (
          <Section key={label} title={label}>
            <p className="whitespace-pre-wrap rounded-lg bg-neutral-900 px-3 py-2 text-[13px]">
              {text}
            </p>
          </Section>
        ))}

        <p className="mt-6 text-xs text-neutral-500">
          อัปเดต {comp.released ?? "-"} · patch {comp.patch}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h2>
      {children}
    </>
  );
}

function HexSection({
  title,
  ids,
  data,
}: {
  title: string;
  ids: string[];
  data: Artifact;
}) {
  if (!ids.length) return null;
  return (
    <Section title={title}>
      <div className="flex flex-col gap-1.5">
        {ids.map((id) => {
          const hex = data.hexes[id];
          if (!hex) return null;
          return (
            <div key={id} className="flex gap-2 rounded-lg bg-neutral-900 px-2 py-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hex.icon}
                alt={hex.name}
                loading="lazy"
                className="h-7 w-7 flex-none rounded-md"
              />
              <div className="min-w-0">
                <b className="text-[13px]">{hex.name}</b>
                {hex.desc && (
                  <p className="mt-0.5 text-[11px] text-neutral-400">{hex.desc}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
