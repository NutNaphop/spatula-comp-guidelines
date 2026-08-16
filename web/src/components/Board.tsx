"use client";

import { Artifact, BOARD_COLS, BOARD_ROWS, COST_BORDER, Unit } from "@/lib/types";

/** The in-game hex grid: 4 rows of 7, odd rows offset half a cell. */
export function Board({ units, data }: { units: Unit[]; data: Artifact }) {
  const byPos = new Map(units.filter((u) => u.pos).map((u) => [u.pos!, u]));

  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: BOARD_ROWS }, (_, r) => r + 1).map((row) => (
        <div key={row} className={`flex gap-1 ${row % 2 ? "ml-[5%]" : ""}`}>
          {Array.from({ length: BOARD_COLS }, (_, c) => c + 1).map((col) => {
            const unit = byPos.get(`${row},${col}`);
            const hero = unit ? data.heroes[unit.hero] : undefined;

            if (!unit || !hero) {
              return (
                <div
                  key={col}
                  className="aspect-square min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900"
                />
              );
            }

            return (
              <div
                key={col}
                title={`${hero.name} (${hero.cost})`}
                className={`relative aspect-square min-w-0 flex-1 rounded-lg border-2 ${
                  COST_BORDER[hero.cost] ?? COST_BORDER[0]
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.icon}
                  alt={hero.name}
                  loading="lazy"
                  className="h-full w-full rounded-md object-cover"
                />
                {unit.star > 1 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] leading-none text-amber-300 drop-shadow-[0_0_3px_#000]">
                    {"★".repeat(unit.star)}
                  </span>
                )}
                {unit.items.length > 0 && (
                  <div className="absolute inset-x-0.5 bottom-0.5 flex justify-center gap-px">
                    {unit.items.map((id, i) => {
                      const item = data.items[id];
                      if (!item) return null;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${id}-${i}`}
                          src={item.icon}
                          alt={item.name}
                          title={item.name}
                          loading="lazy"
                          className="w-[32%] rounded-[2px]"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
