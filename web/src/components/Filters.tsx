"use client";

import { Artifact, tierVar } from "@/lib/types";

export interface FilterState {
  query: string;
  tiers: Set<string>;
  tags: Set<string>;
  pinnedOnly: boolean;
  /** comps the player wrote themselves */
  mineOnly: boolean;
}

/** Chips are outlined, never filled: a filled chip would read as loud as a
 * 5-cost unit and pull the eye away from the boards. */
function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="label flex-none rounded-full border px-2.5 py-1 transition-colors"
      style={{
        borderColor: active ? (color ?? "var(--color-cost-5)") : "var(--color-edge)",
        color: active ? (color ?? "var(--color-cost-5)") : "var(--color-mute)",
      }}
    >
      {children}
    </button>
  );
}

export function Filters({
  data,
  state,
  onChange,
  onToggle,
  onClear,
  onCreate,
  resultCount,
}: {
  data: Artifact;
  state: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  /** Toggling goes through the owner so two taps in the same tick both land -
   * computing the next Set from props here drops the first one. */
  onToggle: (facet: "tiers" | "tags", id: string) => void;
  onClear: () => void;
  onCreate: () => void;
  resultCount: number;
}) {
  const tiers = [...new Set(data.comps.map((c) => c.tier).filter((t): t is string => !!t))]
    .sort();

  const active =
    state.tiers.size +
    state.tags.size +
    (state.pinnedOnly ? 1 : 0) +
    (state.mineOnly ? 1 : 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="search"
          value={state.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="ชื่อคอมพ์ หรือ ชื่อแชมป์"
          className="min-w-0 flex-1 rounded-md bg-slate px-3 py-2 text-[15px] outline-none placeholder:text-mute/70 focus:ring-1 focus:ring-edge"
        />
        <button
          type="button"
          aria-pressed={state.pinnedOnly}
          onClick={() => onChange({ pinnedOnly: !state.pinnedOnly })}
          title="เฉพาะที่ปักหมุด"
          className={`flex-none rounded-md px-3 text-lg leading-none transition-colors ${
            state.pinnedOnly ? "bg-cost-5/15 text-cost-5" : "bg-slate text-mute"
          }`}
        >
          {state.pinnedOnly ? "★" : "☆"}
        </button>
        <button
          type="button"
          onClick={onCreate}
          title="สร้างคอมพ์ของฉัน"
          className="flex-none rounded-md bg-slate px-3 text-lg leading-none text-mute transition-colors hover:text-chalk"
        >
          +
        </button>
      </div>

      <div className="rail flex gap-1.5 overflow-x-auto">
        {/* first in the rail because it is the shortest path to the comps
            only this device has */}
        <Chip
          active={state.mineOnly}
          onClick={() => onChange({ mineOnly: !state.mineOnly })}
        >
          ของฉัน
        </Chip>
        <span aria-hidden className="my-1 w-px flex-none bg-edge" />
        {tiers.map((t) => (
          <Chip
            key={t}
            active={state.tiers.has(t)}
            color={tierVar(t)}
            onClick={() => onToggle("tiers", t)}
          >
            {t}
          </Chip>
        ))}
        <span aria-hidden className="my-1 w-px flex-none bg-edge" />
        {data.tag_groups.flatMap((g) =>
          g.tags.map((tag) => (
            <Chip
              key={tag.id}
              active={state.tags.has(tag.id)}
              onClick={() => onToggle("tags", tag.id)}
            >
              {tag.name}
            </Chip>
          )),
        )}
      </div>

      {active > 0 && (
        <div className="flex items-center gap-3">
          <span className="label">{resultCount} คอมพ์</span>
          <button
            type="button"
            onClick={onClear}
            className="label underline decoration-edge underline-offset-2 hover:text-chalk"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}
    </div>
  );
}
