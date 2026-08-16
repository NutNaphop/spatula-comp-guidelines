"use client";

import { Artifact, Comp, tierVar } from "@/lib/types";
import { finalUnits } from "@/lib/comps";
import { UnitHex } from "./UnitHex";
import { PinButton } from "./PinButton";

/** Tier is the card's spine, not a badge: it encodes rank, so it is
 * structural rather than another coloured object competing with the units. */
export function CompCard({
  comp,
  data,
  pinned,
  onOpen,
  onTogglePin,
}: {
  comp: Comp;
  data: Artifact;
  pinned: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer gap-3 rounded-md bg-slate p-3 pl-0 transition-colors active:bg-edge"
    >
      <span
        aria-hidden
        className="w-[3px] flex-none rounded-r-sm"
        style={{ background: tierVar(comp.tier) }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-baseline gap-2">
          <span className="label" style={{ color: tierVar(comp.tier) }}>
            {comp.tier ?? "—"}
          </span>
          {/* not a heading: the card is a button, and 81 of them would bury
              the detail view's own outline */}
          <span className="min-w-0 flex-1 truncate font-semibold">{comp.name}</span>
          <PinButton pinned={pinned} onClick={onTogglePin} />
        </div>

        <div className="flex flex-wrap gap-x-1">
          {finalUnits(comp).map((u, i) => (
            <UnitHex key={`${u.hero}-${i}`} unit={u} data={data} />
          ))}
        </div>

        {comp.tags.length > 0 && (
          <p className="label truncate">
            {comp.tags.map((t) => data.tags[t]).filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
