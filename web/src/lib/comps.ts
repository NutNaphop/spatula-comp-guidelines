import { Artifact, Comp, Unit } from "./types";

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

/** Matches name, tags, and champion names - the last one answers
 * "I have this unit, which comps want it". */
export function matchesQuery(comp: Comp, query: string, data: Artifact): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (comp.name?.toLowerCase().includes(q)) return true;
  if (comp.tags.some((t) => t.toLowerCase().includes(q))) return true;
  return finalUnits(comp).some((u) =>
    data.heroes[u.hero]?.name.toLowerCase().includes(q),
  );
}
