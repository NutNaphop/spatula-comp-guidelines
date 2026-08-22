"use client";

import { useEffect, useMemo } from "react";
import { Artifact, costVar } from "@/lib/types";
import { displayOrder, finalUnits } from "@/lib/comps";
import { useActiveCompId } from "@/lib/active";
import { useMyComps, withMine } from "@/lib/mycomps";
import { useArtifact } from "@/lib/useArtifact";

/**
 * The collapsed overlay: the comp being built, small enough to sit at the
 * edge of a game screen and be read without stopping to think.
 *
 * Carries come first and every unit shows the items it wants, because the two
 * questions this answers mid-round are "who am I still looking for" and "what
 * do I put on them" - and the second one is the one people get wrong after
 * the shop has been open for thirty seconds.
 */
export function MiniStrip() {
  const state = useArtifact();
  const { mine } = useMyComps();
  const activeId = useActiveCompId();

  const data: Artifact | null = useMemo(
    () => (state.status === "ready" ? withMine(state.data, mine) : null),
    [state, mine],
  );

  const comp = data?.comps.find((c) => c.id === activeId) ?? null;

  /**
   * Tell the shell what is actually on screen.
   *
   * The shell sizes its window from this - a dot or a strip - and it used to
   * keep its own copy of the answer in SharedPreferences, which is one fact
   * stored in two places. They drift: storage here survives a reinstall while
   * the shell's copy does not, and then a strip renders inside a window sized
   * for a dot. So the shell is told on every load, not only when the player
   * taps track, and this side stays the one that decides.
   *
   * It reports the comp, not the stored id: an id left over from a comp that
   * was deleted, or dropped by a patch, renders as a dot and has to be
   * measured as one. Nothing is reported until the artifact has settled,
   * because "still loading" is not "nothing tracked".
   */
  const settled = state.status !== "loading";
  useEffect(() => {
    if (!settled) return;
    window.SpatulaHost?.onActiveComp?.(comp?.id ?? null);
  }, [settled, comp]);

  if (!data || !comp) return <Dot />;

  const units = displayOrder(finalUnits(comp), data);
  // the item row is only worth its height if something is wearing something
  const withItems = units.some((u) => u.items.length > 0);

  return (
    <div className="flex h-dvh w-full flex-wrap content-center justify-center gap-x-1 gap-y-1 overflow-hidden rounded-2xl bg-ink/95 px-1.5 ring-1 ring-edge">
      {units.map((u, i) => {
        const hero = data.heroes[u.hero];
        if (!hero) return null;
        return (
          <span
            key={`${u.hero}-${i}`}
            className="flex w-[26px] flex-none flex-col items-center"
            title={hero.name}
          >
            <span className="relative block h-[26px] w-[26px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.icon}
                alt={hero.name}
                className="h-full w-full rounded border-2 object-cover"
                style={{ borderColor: costVar(hero.cost) }}
              />
              {u.star > 1 && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 font-mono text-[7px] leading-none text-cost-5 drop-shadow-[0_1px_2px_#000]">
                  {"★".repeat(u.star)}
                </span>
              )}
              {u.carry && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cost-5 ring-1 ring-ink" />
              )}
            </span>

            {withItems && (
              <span className="mt-px flex h-2 items-center justify-center gap-px">
                {u.items.map((id, j) => {
                  const item = data.items[id];
                  if (!item) return null;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${id}-${j}`}
                      src={item.icon}
                      alt={item.name}
                      title={item.name}
                      className="h-2 w-2 rounded-[1px]"
                    />
                  );
                })}
              </span>
            )}
          </span>
        );
      })}
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
