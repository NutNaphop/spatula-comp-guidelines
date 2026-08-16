import { describe, expect, it } from "vitest";
import type { FilterState } from "@/components/Filters";
import { makeArtifact } from "./fixtures";
import {
  applyFilters,
  displayOrder,
  finalUnits,
  matchesQuery,
  sortedLevels,
} from "./comps";

const data = makeArtifact();

function filters(over: Partial<FilterState> = {}): FilterState {
  return {
    query: "",
    tiers: new Set<string>(),
    tags: new Set<string>(),
    pinnedOnly: false,
    ...over,
  };
}

const ids = (comps: { id: string }[]) => comps.map((c) => c.id);

describe("applyFilters", () => {
  it("returns everything when nothing is set", () => {
    expect(ids(applyFilters(data, filters(), new Set()))).toEqual(["a", "b", "c"]);
  });

  it("ORs within the tier facet", () => {
    expect(ids(applyFilters(data, filters({ tiers: new Set(["S"]) }), new Set())))
      .toEqual(["a", "c"]);
    expect(ids(applyFilters(data, filters({ tiers: new Set(["S", "A"]) }), new Set())))
      .toEqual(["a", "b", "c"]);
  });

  it("ORs within the tag facet", () => {
    expect(ids(applyFilters(data, filters({ tags: new Set(["t2"]) }), new Set())))
      .toEqual(["b", "c"]);
  });

  it("ANDs across facets, so adding a tag can only narrow", () => {
    const tagOnly = applyFilters(data, filters({ tags: new Set(["t2"]) }), new Set());
    const both = applyFilters(
      data,
      filters({ tags: new Set(["t2"]), tiers: new Set(["S"]) }),
      new Set(),
    );
    expect(ids(both)).toEqual(["c"]);
    expect(both.length).toBeLessThanOrEqual(tagOnly.length);
  });

  it("floats pinned comps to the top without dropping the rest", () => {
    const out = applyFilters(data, filters(), new Set(["c"]));
    expect(ids(out)).toEqual(["c", "a", "b"]);
  });

  it("restricts to pins when pinnedOnly is set", () => {
    expect(ids(applyFilters(data, filters({ pinnedOnly: true }), new Set(["b"]))))
      .toEqual(["b"]);
  });

  it("returns nothing when pinnedOnly is set with no pins", () => {
    expect(applyFilters(data, filters({ pinnedOnly: true }), new Set())).toEqual([]);
  });

  it("combines the query with the facets", () => {
    const out = applyFilters(
      data,
      filters({ query: "aatrox", tiers: new Set(["S"]) }),
      new Set(),
    );
    expect(ids(out)).toEqual(["c"]); // comp b has Aatrox but is tier A
  });

  it("does not mutate the artifact", () => {
    const before = JSON.stringify(data);
    applyFilters(data, filters({ tiers: new Set(["S"]) }), new Set(["a"]));
    expect(JSON.stringify(data)).toEqual(before);
  });
});

describe("matchesQuery", () => {
  const [compA, compB] = data.comps;

  it("matches the comp name case-insensitively", () => {
    expect(matchesQuery(compA, "BARD sh", data)).toBe(true);
  });

  it("matches a champion in the comp - the 'I have this unit' case", () => {
    expect(matchesQuery(compB, "aatrox", data)).toBe(true);
    expect(matchesQuery(compA, "aatrox", data)).toBe(false);
  });

  it("matches a tag title, including Thai", () => {
    expect(matchesQuery(compB, "รีโรล", data)).toBe(true);
  });

  it("treats blank and whitespace-only queries as no filter", () => {
    expect(matchesQuery(compA, "", data)).toBe(true);
    expect(matchesQuery(compA, "   ", data)).toBe(true);
  });

  it("does not match on the tag id itself", () => {
    expect(matchesQuery(compA, "t1", data)).toBe(false);
  });
});

describe("board helpers", () => {
  it("previews the level the comp is aiming for", () => {
    expect(finalUnits(data.comps[2])).toHaveLength(2);
  });

  it("returns an empty board rather than throwing on a missing level", () => {
    const broken = { ...data.comps[0], final_level: 99 };
    expect(finalUnits(broken)).toEqual([]);
  });

  it("orders levels numerically, not as strings", () => {
    const comp = { ...data.comps[0], levels: { "10": [], "2": [], "9": [] } };
    expect(sortedLevels(comp)).toEqual(["2", "9", "10"]);
  });

  it("puts carries first, then the most expensive units", () => {
    const units = finalUnits(data.comps[2]);
    const ordered = displayOrder(units, data);
    expect(ordered[0].carry).toBe(true);
    expect(data.heroes[ordered[0].hero].name).toBe("Rammus");
  });

  it("sorts unknown heroes last instead of throwing", () => {
    const units = [
      { hero: "ghost", star: 1, pos: null, carry: false, items: [] },
      ...finalUnits(data.comps[2]),
    ];
    expect(() => displayOrder(units, data)).not.toThrow();
    expect(displayOrder(units, data)).toHaveLength(3);
  });
});
