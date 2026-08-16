"use client";

import { Artifact, BOARD_COLS, BOARD_ROWS, Unit } from "@/lib/types";
import { UnitHex } from "./UnitHex";

/** The in-game grid: 4 rows of 7 hexes, alternate rows offset half a cell.
 * Row 1 is the front line, nearest the enemy, same as on screen. */
export function Board({ units, data }: { units: Unit[]; data: Artifact }) {
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
            const unit = byPos.get(`${row},${col}`);
            return (
              <div key={col} className="min-w-0 flex-1">
                {unit ? (
                  <UnitHex unit={unit} data={data} size="cell" />
                ) : (
                  <div
                    className="hex w-full bg-edge/45"
                    style={{ aspectRatio: "1 / 0.866" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
