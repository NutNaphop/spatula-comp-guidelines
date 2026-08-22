import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyOf, exportMine, importMine, isUsableComp, withMine } from "./mycomps";
import { makeArtifact } from "./fixtures";
import { Comp, MY_PREFIX } from "./types";

/** Own comps are the one thing here that exists nowhere but this device: the
 * artifact can always be refetched, these cannot. So the parsing has to
 * survive a hand-pasted backup, and the merge has to survive being run twice. */
function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
  return store;
}

const KEY = "spatula.mycomps.v1";

function mineComp(over: Partial<Comp> = {}): Comp {
  return {
    id: `${MY_PREFIX}1`,
    name: "ของฉัน",
    tier: null,
    author: null,
    tags: [],
    difficulty: null,
    released: null,
    patch: "18.17.7",
    final_level: 1,
    levels: { "1": [{ hero: "h1", star: 1, pos: "2,3", carry: true, items: ["i1"] }] },
    hexes: { recommended: [], alternatives: [] },
    gods: [],
    notes: { early: null, positioning: null, items: null, hex: null, god: null },
    ...over,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("exportMine", () => {
  it("returns nothing when the player has written nothing", () => {
    stubStorage();
    expect(exportMine()).toEqual([]);
  });

  it("returns an empty list rather than throwing on corrupt storage", () => {
    stubStorage({ [KEY]: "{not json" });
    expect(exportMine()).toEqual([]);
  });

  it("drops entries that could not be rendered", () => {
    stubStorage({
      [KEY]: JSON.stringify([mineComp(), null, 7, { id: "my:2" }, { name: "no id" }]),
    });
    expect(exportMine().map((c) => c.id)).toEqual([`${MY_PREFIX}1`]);
  });

  it("drops comps whose id is not in the own-comp space, which would collide with the artifact", () => {
    stubStorage({ [KEY]: JSON.stringify([mineComp({ id: "1234" })]) });
    expect(exportMine()).toEqual([]);
  });
});

describe("importMine", () => {
  it("merges by id so restoring the same backup twice does not duplicate", () => {
    const store = stubStorage({ [KEY]: JSON.stringify([mineComp()]) });
    importMine([mineComp({ name: "แก้แล้ว" })]);
    const saved = JSON.parse(store.get(KEY)!) as Comp[];
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("แก้แล้ว");
  });

  it("keeps comps the backup did not mention", () => {
    const store = stubStorage({ [KEY]: JSON.stringify([mineComp()]) });
    importMine([mineComp({ id: `${MY_PREFIX}2` })]);
    expect((JSON.parse(store.get(KEY)!) as Comp[]).map((c) => c.id)).toEqual([
      `${MY_PREFIX}1`,
      `${MY_PREFIX}2`,
    ]);
  });

  it("ignores anything that is not a list", () => {
    stubStorage();
    expect(importMine({ nope: true })).toBe(0);
    expect(importMine(undefined)).toBe(0);
  });

  it("leaves storage untouched when the list holds nothing usable", () => {
    const store = stubStorage({ [KEY]: JSON.stringify([mineComp()]) });
    expect(importMine([1, "x", null])).toBe(0);
    expect((JSON.parse(store.get(KEY)!) as Comp[])).toHaveLength(1);
  });
});

describe("copyOf", () => {
  it("keeps the board but drops what stops being true once it is edited", () => {
    const source = makeArtifact().comps[0];
    const copy = copyOf(source);

    expect(copy.id.startsWith(MY_PREFIX)).toBe(true);
    expect(copy.id).not.toBe(source.id);
    expect(copy.tier).toBeNull();
    expect(copy.author).toBeNull();
    expect(copy.tags).toEqual([]);
    expect(copy.levels[String(copy.final_level)]).toEqual(
      source.levels[String(source.final_level)],
    );
  });

  it("deep-copies the units, so editing the copy cannot change the artifact", () => {
    const source = makeArtifact().comps[0];
    const copy = copyOf(source);
    const before = [...source.levels[String(source.final_level)][0].items];
    copy.levels[String(copy.final_level)][0].items.push("i1");
    expect(source.levels[String(source.final_level)][0].items).toEqual(before);
  });

  it("stores the board under the level the unit count implies", () => {
    const source = makeArtifact().comps[2]; // two units
    const copy = copyOf(source);
    expect(copy.final_level).toBe(2);
    expect(copy.levels["2"]).toHaveLength(2);
  });
});

describe("withMine", () => {
  it("puts own comps first so they are the shortest thing to reach", () => {
    const data = makeArtifact();
    const merged = withMine(data, [mineComp()]);
    expect(merged.comps[0].id).toBe(`${MY_PREFIX}1`);
    expect(merged.comps).toHaveLength(data.comps.length + 1);
  });

  it("returns the artifact untouched when there is nothing to merge", () => {
    const data = makeArtifact();
    expect(withMine(data, [])).toBe(data);
  });
});

describe("isUsableComp", () => {
  it("rejects a comp with no levels, which would render as an empty board", () => {
    expect(isUsableComp({ id: "my:1", name: "x" })).toBe(false);
  });

  it("accepts a comp that has everything the list needs", () => {
    expect(isUsableComp(mineComp())).toBe(true);
  });
});
