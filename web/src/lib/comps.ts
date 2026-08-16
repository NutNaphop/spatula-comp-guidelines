import { Artifact, Comp, Unit } from "./types";
import type { FilterState } from "@/components/Filters";

/** The board the comp is aiming for - what the card previews. */
export function finalUnits(comp: Comp): Unit[] {
  return comp.levels[String(comp.final_level)] ?? [];
}

export function sortedLevels(comp: Comp): string[] {
  return Object.keys(comp.levels).sort((a, b) => Number(a) - Number(b));
}

/** Carries first, then by cost - reading order for "what am I building". */
export function displayOrder(units: Unit[], data: Artifact): Unit[] {
  return [...units].sort(
    (a, b) =>
      Number(b.carry) - Number(a.carry) ||
      (data.heroes[b.hero]?.cost ?? 0) - (data.heroes[a.hero]?.cost ?? 0),
  );
}

/** Matches comp name, tag titles, and champion names - the last one answers
 * "I have this unit, which comps want it". */
export function matchesQuery(comp: Comp, query: string, data: Artifact): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (comp.name?.toLowerCase().includes(q)) return true;
  if (comp.tags.some((t) => data.tags[t]?.toLowerCase().includes(q))) return true;
  return finalUnits(comp).some((u) =>
    data.heroes[u.hero]?.name.toLowerCase().includes(q),
  );
}

/** Tiers and tags are OR within a facet and AND across facets: picking two
 * tiers widens the list, adding a tag narrows it. */
export function applyFilters(
  data: Artifact,
  state: FilterState,
  pins: Set<string>,
): Comp[] {
  const hits = data.comps.filter((c) => {
    if (state.pinnedOnly && !pins.has(c.id)) return false;
    if (state.tiers.size && (!c.tier || !state.tiers.has(c.tier))) return false;
    if (state.tags.size && !c.tags.some((t) => state.tags.has(t))) return false;
    return matchesQuery(c, state.query, data);
  });
  // pinned float up: fast access to your own list is the whole point
  return [...hits.filter((c) => pins.has(c.id)), ...hits.filter((c) => !pins.has(c.id))];
}
