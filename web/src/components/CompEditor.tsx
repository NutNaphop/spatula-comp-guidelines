"use client";

import { useMemo, useState } from "react";
import { Artifact, Comp, Unit, costVar } from "@/lib/types";
import { finalUnits } from "@/lib/comps";
import { Board } from "./Board";
import { HeroPicker, ItemPicker } from "./Picker";

const MAX_ITEMS = 3;

type Picking = { kind: "hero"; pos: string } | { kind: "item"; pos: string } | null;

/**
 * Build a comp of your own.
 *
 * The board is the editor. Positioning is half of what a comp is worth, and
 * the player already reads this exact grid, so placing a unit is tapping the
 * hex it goes on rather than filling in a form and hoping the preview agrees.
 *
 * Everything is held as a draft until save, so backing out of an edit leaves
 * the stored comp exactly as it was.
 */
export function CompEditor({
  draft,
  data,
  existing,
  onSave,
  onDelete,
  onClose,
}: {
  draft: Comp;
  data: Artifact;
  /** false while the comp has never been saved, which is what hides delete */
  existing: boolean;
  onSave: (comp: Comp) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(draft.name);
  const [units, setUnits] = useState<Unit[]>(() => finalUnits(draft));
  const [selected, setSelected] = useState<string | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const unit = useMemo(
    () => units.find((u) => u.pos === selected) ?? null,
    [units, selected],
  );

  const patch = (pos: string, change: (u: Unit) => Unit) =>
    setUnits((prev) => prev.map((u) => (u.pos === pos ? change(u) : u)));

  /**
   * One tap does three different things depending on what is already
   * selected, which is the smallest interaction that covers place, move and
   * inspect without a mode switch:
   *
   *  - empty cell, nothing selected  -> add a unit here
   *  - empty cell, a unit selected   -> move that unit here
   *  - occupied cell                 -> select it (again to deselect)
   */
  const onCell = (pos: string) => {
    const here = units.find((u) => u.pos === pos);
    if (here) {
      setSelected((prev) => (prev === pos ? null : pos));
      return;
    }
    if (selected) {
      patch(selected, (u) => ({ ...u, pos }));
      setSelected(pos);
      return;
    }
    setPicking({ kind: "hero", pos });
  };

  const addHero = (heroId: string, pos: string) => {
    setUnits((prev) => [...prev, { hero: heroId, star: 1, pos, carry: false, items: [] }]);
    setSelected(pos);
    setPicking(null);
  };

  const removeUnit = (pos: string) => {
    setUnits((prev) => prev.filter((u) => u.pos !== pos));
    setSelected(null);
  };

  const level = Math.max(units.length, 1);

  const save = () =>
    onSave({
      ...draft,
      name: name.trim() || "คอมพ์ของฉัน",
      patch: data.meta.version,
      levels: { [String(level)]: units },
      final_level: level,
    });

  return (
    <div className="sheet fixed inset-0 z-20 overflow-y-auto bg-ink pb-10">
      <div className="mx-auto max-w-xl px-3">
        <div className="sticky top-0 -mx-3 flex items-center justify-between gap-3 bg-ink/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
          <button type="button" onClick={onClose} className="label py-1 hover:text-chalk">
            ← ยกเลิก
          </button>
          <button
            type="button"
            onClick={save}
            disabled={units.length === 0}
            className="rounded-md border border-cost-5 px-3 py-1.5 text-sm text-cost-5 transition-opacity disabled:opacity-35"
          >
            บันทึก
          </button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อคอมพ์"
          className="mt-1 w-full rounded-md bg-slate px-3 py-2 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-mute/70 focus:ring-1 focus:ring-edge"
        />

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="label">กระดาน</span>
            <span className="label normal-case">
              {units.length} ยูนิต · เลเวล {level}
            </span>
          </div>
          <Board units={units} data={data} onCell={onCell} selected={selected} />
          <p className="label mt-2 normal-case tracking-normal">
            {selected
              ? "แตะช่องว่างเพื่อย้ายยูนิตที่เลือก · แตะยูนิตอีกครั้งเพื่อยกเลิก"
              : "แตะช่องว่างเพื่อเพิ่มยูนิต · แตะยูนิตเพื่อแก้ไข"}
          </p>
        </div>

        {unit ? (
          <UnitInspector
            unit={unit}
            data={data}
            onStar={(star) => patch(unit.pos!, (u) => ({ ...u, star }))}
            onCarry={() => patch(unit.pos!, (u) => ({ ...u, carry: !u.carry }))}
            onAddItem={() => setPicking({ kind: "item", pos: unit.pos! })}
            onRemoveItem={(index) =>
              patch(unit.pos!, (u) => ({
                ...u,
                items: u.items.filter((_, i) => i !== index),
              }))
            }
            onRemove={() => removeUnit(unit.pos!)}
          />
        ) : (
          units.length === 0 && (
            <p className="mt-8 text-center text-sm text-mute">
              แตะช่องบนกระดานเพื่อวางแชมป์ตัวแรก
            </p>
          )
        )}

        {existing && (
          <div className="mt-10 border-t border-edge/60 pt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-mute">ลบคอมพ์นี้ถาวร?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  className="label rounded-md border border-tier-s px-3 py-1.5 text-tier-s"
                >
                  ลบ
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="label hover:text-chalk"
                >
                  ไม่ลบ
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="label hover:text-tier-s"
              >
                ลบคอมพ์นี้
              </button>
            )}
          </div>
        )}
      </div>

      {picking?.kind === "hero" && (
        <HeroPicker
          data={data}
          onPick={(heroId) => addHero(heroId, picking.pos)}
          onClose={() => setPicking(null)}
        />
      )}
      {picking?.kind === "item" && (
        <ItemPicker
          data={data}
          onPick={(itemId) => {
            patch(picking.pos, (u) => ({
              ...u,
              items: [...u.items, itemId].slice(0, MAX_ITEMS),
            }));
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

function UnitInspector({
  unit,
  data,
  onStar,
  onCarry,
  onAddItem,
  onRemoveItem,
  onRemove,
}: {
  unit: Unit;
  data: Artifact;
  onStar: (star: number) => void;
  onCarry: () => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onRemove: () => void;
}) {
  const hero = data.heroes[unit.hero];
  if (!hero) return null;

  return (
    <section className="mt-5 rounded-md bg-slate p-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.icon}
          alt=""
          className="h-10 w-10 flex-none rounded border-2 object-cover"
          style={{ borderColor: costVar(hero.cost) }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{hero.name}</p>
          <p className="truncate text-xs text-mute">{hero.traits.join(" · ")}</p>
        </div>
        <button type="button" onClick={onRemove} className="label hover:text-tier-s">
          เอาออก
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="label w-10 flex-none">ดาว</span>
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStar(s)}
            aria-pressed={unit.star === s}
            className={`label rounded border px-2 py-1 transition-colors ${
              unit.star === s ? "border-cost-5 text-cost-5" : "border-edge hover:text-chalk"
            }`}
          >
            {"★".repeat(s)}
          </button>
        ))}
        <button
          type="button"
          onClick={onCarry}
          aria-pressed={unit.carry}
          className={`label ml-auto rounded border px-2 py-1 transition-colors ${
            unit.carry ? "border-cost-5 text-cost-5" : "border-edge hover:text-chalk"
          }`}
        >
          ตัวหลัก
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="label w-10 flex-none">ไอเทม</span>
        {unit.items.map((id, i) => {
          const item = data.items[id];
          return (
            <button
              key={`${id}-${i}`}
              type="button"
              onClick={() => onRemoveItem(i)}
              title={item?.name ?? id}
              className="h-8 w-8 flex-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item?.icon ?? ""}
                alt={item?.name ?? ""}
                className="h-full w-full rounded"
              />
            </button>
          );
        })}
        {unit.items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={onAddItem}
            className="h-8 w-8 flex-none rounded border border-dashed border-edge text-mute hover:text-chalk"
          >
            +
          </button>
        )}
        {unit.items.length > 0 && (
          <span className="label ml-1 normal-case tracking-normal">แตะเพื่อเอาออก</span>
        )}
      </div>
    </section>
  );
}
