"use client";

import { Artifact, Comp, COST_BORDER, TIER_BG } from "@/lib/types";
import { finalUnits } from "@/lib/comps";

export function CompCard({
  comp,
  data,
  pinned,
  onOpen,
  onTogglePin,
}: {
  comp: Comp;
  data: Artifact;
  pinned: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-left active:bg-neutral-800"
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid h-6 w-6 flex-none place-items-center rounded-md text-[13px] font-bold text-neutral-900 ${
            TIER_BG[comp.tier ?? "C"] ?? TIER_BG.C
          }`}
        >
          {comp.tier ?? "-"}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{comp.name}</span>
        <button
          type="button"
          aria-label={pinned ? "เอาหมุดออก" : "ปักหมุด"}
          aria-pressed={pinned}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`flex-none px-1 text-lg ${pinned ? "text-amber-300" : "text-neutral-600"}`}
        >
          ★
        </button>
      </div>

      {comp.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {comp.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-neutral-800 px-2 py-px text-[11px] text-neutral-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {finalUnits(comp).map((u, i) => {
          const hero = data.heroes[u.hero];
          if (!hero) return null;
          return (
            <span key={`${u.hero}-${i}`} className="relative h-9 w-9 flex-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.icon}
                alt={hero.name}
                title={`${hero.name} (${hero.cost})`}
                loading="lazy"
                className={`h-full w-full rounded-md border-2 object-cover ${
                  COST_BORDER[hero.cost] ?? COST_BORDER[0]
                }`}
              />
              {u.carry && (
                <span className="absolute -top-1.5 -right-1 text-[11px] text-amber-300 drop-shadow-[0_0_3px_#000]">
                  ★
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
