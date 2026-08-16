import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportPins, importPins } from "./pins";

/** localStorage is the only place pins exist, and iOS can evict it, so the
 * export/import path is the difference between "my list is gone" and "my
 * list is restorable". It has to survive corrupt input. */
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

const KEY = "spatula.pinned.v1";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("exportPins", () => {
  it("returns an empty list when nothing is pinned", () => {
    stubStorage();
    expect(exportPins()).toBe("[]");
  });

  it("round-trips through import", () => {
    stubStorage({ [KEY]: JSON.stringify(["a", "b"]) });
    expect(JSON.parse(exportPins())).toEqual(["a", "b"]);
  });

  it("returns an empty list rather than throwing on corrupt storage", () => {
    stubStorage({ [KEY]: "{not json" });
    expect(exportPins()).toBe("[]");
  });

  it("drops non-string entries", () => {
    stubStorage({ [KEY]: JSON.stringify(["a", 7, null, "b"]) });
    expect(JSON.parse(exportPins())).toEqual(["a", "b"]);
  });
});

describe("importPins", () => {
  it("merges into what is already pinned instead of replacing it", () => {
    const store = stubStorage({ [KEY]: JSON.stringify(["a"]) });
    importPins(JSON.stringify(["b"]));
    expect(JSON.parse(store.get(KEY)!)).toEqual(["a", "b"]);
  });

  it("does not duplicate ids that are already pinned", () => {
    const store = stubStorage({ [KEY]: JSON.stringify(["a"]) });
    importPins(JSON.stringify(["a", "a"]));
    expect(JSON.parse(store.get(KEY)!)).toEqual(["a"]);
  });

  it("reports how many ids the file carried", () => {
    stubStorage();
    expect(importPins(JSON.stringify(["a", "b", "c"]))).toBe(3);
  });

  it("rejects a file that is not a list", () => {
    stubStorage();
    expect(() => importPins(JSON.stringify({ a: 1 }))).toThrow("รูปแบบไฟล์ไม่ถูกต้อง");
  });

  it("rejects malformed json", () => {
    stubStorage();
    expect(() => importPins("nope")).toThrow();
  });

  it("leaves existing pins untouched when the import is rejected", () => {
    const store = stubStorage({ [KEY]: JSON.stringify(["a"]) });
    expect(() => importPins("nope")).toThrow();
    expect(JSON.parse(store.get(KEY)!)).toEqual(["a"]);
  });
});
