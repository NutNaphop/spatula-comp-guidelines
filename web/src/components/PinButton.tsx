"use client";

export function PinButton({
  pinned,
  onClick,
  large = false,
}: {
  pinned: boolean;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={pinned ? "เอาหมุดออก" : "ปักหมุด"}
      aria-pressed={pinned}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex-none leading-none transition-colors ${
        large ? "p-1 text-2xl" : "px-1 text-lg"
      } ${pinned ? "text-cost-5" : "text-mute/50 hover:text-mute"}`}
    >
      {pinned ? "★" : "☆"}
    </button>
  );
}
