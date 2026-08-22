import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportAll, importAll } from "./backup";

/** The backup is the only thing standing between an evicted localStorage and
 * a list the player has to rebuild by hand, so it has to keep reading files
 * written by older versions of the app. */
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

const PINS = "spatula.pinned.v1";
const MINE = "spatula.mycomps.v1";

const comp = {
  id: "my:1",
  name: "ของฉัน",
  levels: { "1": [] },
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("exportAll", () => {
  it("carries both the pins and the comps written here", () => {
    stubStorage({ [PINS]: JSON.stringify(["a"]), [MINE]: JSON.stringify([comp]) });
    const backup = JSON.parse(exportAll());
    expect(backup.pins).toEqual(["a"]);
    expect(backup.comps).toHaveLength(1);
  });
});

describe("importAll", () => {
  it("round-trips its own output", () => {
    stubStorage({ [PINS]: JSON.stringify(["a"]), [MINE]: JSON.stringify([comp]) });
    const text = exportAll();

    const store = stubStorage();
    expect(importAll(text)).toEqual({ pins: 1, comps: 1 });
    expect(JSON.parse(store.get(PINS)!)).toEqual(["a"]);
    expect(JSON.parse(store.get(MINE)!)).toHaveLength(1);
  });

  it("still reads a v1 backup, which was a bare list of pinned ids", () => {
    const store = stubStorage();
    expect(importAll(JSON.stringify(["a", "b"]))).toEqual({ pins: 2, comps: 0 });
    expect(JSON.parse(store.get(PINS)!)).toEqual(["a", "b"]);
  });

  it("restores the pins even when the file has no comps in it", () => {
    stubStorage();
    expect(importAll(JSON.stringify({ v: 2, pins: ["a"] }))).toEqual({ pins: 1, comps: 0 });
  });

  it("rejects a file that is neither shape", () => {
    stubStorage();
    expect(() => importAll(JSON.stringify({ hello: 1 }))).toThrow("รูปแบบไฟล์ไม่ถูกต้อง");
  });

  it("rejects malformed json", () => {
    stubStorage();
    expect(() => importAll("nope")).toThrow();
  });
});
