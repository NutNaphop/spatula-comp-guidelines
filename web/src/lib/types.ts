/** Mirrors the artifact produced by `python -m spatula.normalize`.
 *
 * Keep SCHEMA_VERSION in step with `config.SCHEMA_VERSION` on the pipeline
 * side: the app refuses to render an artifact it was not written for, rather
 * than misreading a newer layout. */
export const SCHEMA_VERSION = 2;

export interface Meta {
  schema_version: number;
  version: string;
  season: string;
  set_id: string;
  mode: string;
  source_time: string;
  generated_at: string;
  comp_count: number;
}

export interface Hero {
  name: string;
  cost: number;
  traits: string[];
  icon: string;
  skill_name?: string;
  skill_desc?: string;
  skill_icon?: string;
}

export interface Item {
  name: string;
  icon: string;
  desc?: string;
}

export interface Hex {
  name: string;
  icon: string;
  desc?: string;
  level?: string;
}

export interface God {
  name: string;
  icon: string;
  tips?: string;
}

/** One champion on the board. `pos` is "row,col" with row 1-4, col 1-7. */
export interface Unit {
  hero: string;
  star: number;
  pos: string | null;
  carry: boolean;
  items: string[];
}

export interface GodPick {
  stage: number;
  god: string;
  wishes: string[];
}

export interface Comp {
  id: string;
  name: string;
  tier: string | null;
  author: string | null;
  tags: string[];
  difficulty: string | null;
  released: string | null;
  patch: string;
  final_level: number | null;
  /** keyed by player level ("3".."10") */
  levels: Record<string, Unit[]>;
  hexes: { recommended: string[]; alternatives: string[] };
  gods: GodPick[];
  notes: {
    early: string | null;
    positioning: string | null;
    items: string | null;
    hex: string | null;
    god: string | null;
  };
}

export interface TagGroup {
  id: string;
  name: string;
  tags: { id: string; name: string }[];
}

export interface Artifact {
  meta: Meta;
  heroes: Record<string, Hero>;
  items: Record<string, Item>;
  hexes: Record<string, Hex>;
  gods: Record<string, God>;
  /** tag id -> localised title */
  tags: Record<string, string>;
  /** filter options, already trimmed to tags that comps actually use */
  tag_groups: TagGroup[];
  comps: Comp[];
}

export const BOARD_ROWS = 4;
export const BOARD_COLS = 7;

/** The in-game rarity scale. Deliberately the only chroma in the interface. */
export function costVar(cost: number): string {
  const c = cost >= 1 && cost <= 5 ? cost : 0;
  return `var(--color-cost-${c})`;
}

export function tierVar(tier: string | null): string {
  const t = (tier ?? "C").toLowerCase();
  return ["s", "a", "b", "c"].includes(t) ? `var(--color-tier-${t})` : "var(--color-tier-c)";
}
