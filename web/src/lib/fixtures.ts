import { Artifact, Comp, SCHEMA_VERSION, Unit } from "./types";

/** Minimal artifact for tests: three comps that differ on every axis the
 * filters look at, so a broken facet shows up as a wrong count. */
export function makeArtifact(): Artifact {
  return {
    meta: {
      schema_version: SCHEMA_VERSION,
      version: "18.17.7",
      season: "S18",
      set_id: "17",
      mode: "17",
      source_time: "2026-08-12 07:05:58",
      generated_at: "2026-08-16T00:00:00+00:00",
      comp_count: 3,
    },
    heroes: {
      h1: { name: "Rammus", cost: 4, traits: ["Bastion"], icon: "" },
      h2: { name: "Bard", cost: 5, traits: ["Conduit"], icon: "" },
      h3: { name: "Aatrox", cost: 1, traits: ["Brawler"], icon: "" },
    },
    items: { i1: { name: "Blue Buff", icon: "" } },
    hexes: { x1: { name: "Calculated Loss", icon: "" } },
    gods: { g1: { name: "Yasuo", icon: "" } },
    tags: { t1: "Fast 8", t2: "รีโรลตัว 1 บาท" },
    tag_groups: [
      {
        id: "2",
        name: "ประเภทคอมพ์",
        tags: [
          { id: "t1", name: "Fast 8" },
          { id: "t2", name: "รีโรลตัว 1 บาท" },
        ],
      },
    ],
    comps: [
      makeComp({ id: "a", name: "Bard Shepherd", tier: "S", tags: ["t1"], heroes: ["h2"] }),
      makeComp({ id: "b", name: "Aatrox Reroll", tier: "A", tags: ["t2"], heroes: ["h3"] }),
      makeComp({
        id: "c",
        name: "Rammus Wall",
        tier: "S",
        tags: ["t1", "t2"],
        heroes: ["h1", "h3"],
      }),
    ],
  };
}

function makeComp({
  id,
  name,
  tier,
  tags,
  heroes,
}: {
  id: string;
  name: string;
  tier: string;
  tags: string[];
  heroes: string[];
}): Comp {
  const units: Unit[] = heroes.map((hero, i) => ({
    hero,
    star: i === 0 ? 2 : 1,
    pos: `${i + 1},${i + 1}`,
    carry: i === 0,
    items: i === 0 ? ["i1"] : [],
  }));
  return {
    id,
    name,
    tier,
    author: "tester",
    tags,
    difficulty: null,
    released: "2026-07-17 00:00:00",
    patch: "18.17.7-S18",
    final_level: 8,
    levels: { "6": units.slice(0, 1), "8": units },
    hexes: { recommended: ["x1"], alternatives: [] },
    gods: [{ stage: 2, god: "g1", wishes: [] }],
    notes: { early: null, positioning: null, items: null, hex: null, god: null },
  };
}
