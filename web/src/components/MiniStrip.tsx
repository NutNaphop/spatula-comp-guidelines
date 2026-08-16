"use client";

import { Artifact, costVar } from "@/lib/types";
import { finalUnits } from "@/lib/comps";
import { useActiveCompId } from "@/lib/active";
import { useArtifact } from "@/lib/useArtifact";

/**
 * The collapsed overlay: the comp being built, small enough to sit at the
 * edge of a game screen and be read without stopping to think.
 *
 * Items are shown only on carries. Everything else is a face and a cost
 * colour, because the question this answers mid-round is "who am I still
 * looking for", not "what does this unit do".
 */
export function MiniStrip() {
  const state = useArtifact();
  const activeId = useActiveCompId();

  if (state.status !== "ready") return <Dot />;
  const data: Artifact = state.data;
  const comp = data.comps.find((c) => c.id === activeId);
  if (!comp) return <Dot />;

  return (
    <div className="flex h-dvh w-full items-center gap-1.5 overflow-hidden rounded-2xl bg-ink/95 px-2 ring-1 ring-edge">
      <div className="flex min-w-0 flex-1 flex-wrap content-center gap-1">
        {finalUnits(comp).map((u, i) => {
          const hero = data.heroes[u.hero];
          if (!hero) return null;
          return (
            <span
              key={`${u.hero}-${i}`}
              className="relative block h-7 w-7 flex-none"
              title={hero.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.icon}
                alt={hero.name}
                className="h-full w-full rounded border-2 object-cover"
                style={{ borderColor: costVar(hero.cost) }}
              />
              {u.carry && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cost-5 ring-1 ring-ink" />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Nothing tracked yet: a plain dot, so the overlay covers as little of the
 * board as it possibly can. */
function Dot() {
  return (
    <div className="flex h-dvh w-full items-center justify-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-cost-5 font-mono text-lg font-bold text-ink">
        S
      </span>
    </div>
  );
}
