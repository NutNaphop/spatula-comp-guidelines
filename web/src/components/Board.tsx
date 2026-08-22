"use client";

import { Artifact, BOARD_COLS, BOARD_ROWS, Unit } from "@/lib/types";
import { UnitHex } from "./UnitHex";

/** The in-game grid: 4 rows of 7 hexes, alternate rows offset half a cell.
 * Row 1 is the front line, nearest the enemy, same as on screen.
 *
 * Passing [onCell] turns every hex into a button, which is how the editor
 * places units - the same board the player reads is the one they edit, so
 * positioning never has a second layout to learn. */
export function Board({
  units,
  data,
  onCell,
  selected = null,
}: {
  units: Unit[];
  data: Artifact;
  onCell?: (pos: string) => void;
  selected?: string | null;
}) {
  const byPos = new Map(units.filter((u) => u.pos).map((u) => [u.pos!, u]));

  return (
    // room on the right for the offset rows to shift into
    <div className="flex flex-col gap-1" style={{ paddingRight: "calc(100% / 14)" }}>
      {Array.from({ length: BOARD_ROWS }, (_, r) => r + 1).map((row) => (
        <div
          key={row}
          className="flex gap-1"
          style={row % 2 ? { transform: "translateX(calc(100% / 14))" } : undefined}
        >
          {Array.from({ length: BOARD_COLS }, (_, c) => c + 1).map((col) => {
            const pos = `${row},${col}`;
            const unit = byPos.get(pos);
            const isSelected = selected === pos;

            const content = unit ? (
              <UnitHex unit={unit} data={data} size="cell" />
            ) : (
              <div
                className={`hex w-full ${isSelected ? "bg-cost-5/50" : "bg-edge/45"}`}
                style={{ aspectRatio: "1 / 0.866" }}
              />
            );

            return (
              <div key={col} className="min-w-0 flex-1">
                {onCell ? (
                  <button
                    type="button"
                    onClick={() => onCell(pos)}
                    aria-label={pos}
                    aria-pressed={isSelected}
                    // the hex is clipped, so selection cannot be a ring:
                    // it lifts instead, which reads at board size
                    className={`block w-full transition-transform ${
                      isSelected ? "scale-110" : ""
                    }`}
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
