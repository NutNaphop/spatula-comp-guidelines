"use client";

import { Artifact, Unit } from "@/lib/types";
import { costVar } from "@/lib/types";

/** A champion as the board's own hexagon. The cost colour is carried by the
 * ring, which is the only saturated thing in the interface. */
export function UnitHex({
  unit,
  data,
  size = "chip",
}: {
  unit: Unit;
  data: Artifact;
  size?: "chip" | "cell";
}) {
  const hero = data.heroes[unit.hero];
  if (!hero) return null;

  const cell = size === "cell";

  return (
    <div
      className={cell ? "relative w-full" : "relative w-9 flex-none"}
      style={{ aspectRatio: "1 / 0.866" }}
      title={`${hero.name} · ${hero.cost}`}
    >
      {/* ring */}
      <div
        className="hex absolute inset-0"
        style={{ background: costVar(hero.cost) }}
      />
      {/* portrait, inset by the ring width */}
      <div className="hex absolute inset-[1.5px] overflow-hidden bg-slate">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.icon}
          alt={hero.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full scale-[1.15] object-cover"
        />
      </div>

      {unit.star > 1 && (
        <span
          className="absolute -top-1 left-1/2 -translate-x-1/2 font-mono leading-none text-cost-5 drop-shadow-[0_1px_2px_#000]"
          style={{ fontSize: cell ? 9 : 8 }}
        >
          {"★".repeat(unit.star)}
        </span>
      )}

      {unit.carry && !cell && (
        <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-cost-5 ring-2 ring-ink" />
      )}

      {cell && unit.items.length > 0 && (
        <div className="absolute inset-x-1 bottom-0 flex justify-center gap-px">
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
                className="w-[30%] rounded-[2px] ring-1 ring-ink/70"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
