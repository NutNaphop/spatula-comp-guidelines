"use client";

import { useEffect, useRef, useState } from "react";
import { exportAll, importAll } from "@/lib/backup";

/** Pins and the comps you wrote live only in this device's storage, and iOS
 * evicts web storage for sites that go unused. This is the way back.
 *
 * Deliberately a text box rather than a file download: downloads are awkward
 * inside an Android WebView and a home-screen web app, while select-all and
 * paste work everywhere. */
export function Backup({
  onDone,
  onRestored,
}: {
  onDone: () => void;
  onRestored: () => void;
}) {
  const [tab, setTab] = useState<"backup" | "restore">("backup");
  const [text, setText] = useState(() => exportAll());
  const [message, setMessage] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // switching tabs is an event, not a synchronisation - deriving this in an
  // effect would render twice and blank the box for a frame
  const switchTab = (next: "backup" | "restore") => {
    setTab(next);
    setText(next === "backup" ? exportAll() : "");
    setMessage(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const restore = () => {
    try {
      const { pins, comps } = importAll(text);
      onRestored();
      setMessage(`กู้คืนแล้ว — หมุด ${pins} · คอมพ์ของฉัน ${comps}`);
    } catch {
      setMessage("อ่านไฟล์สำรองไม่ได้ ตรวจว่าวางข้อความครบทั้งก้อนหรือยัง");
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/80 sm:items-center sm:justify-center">
      <div className="sheet w-full rounded-t-xl bg-slate p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-xl">
        <div className="mb-3 flex items-center gap-4">
          {(["backup", "restore"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              aria-pressed={tab === t}
              className={`label ${tab === t ? "text-chalk" : ""}`}
            >
              {t === "backup" ? "สำรอง" : "กู้คืน"}
            </button>
          ))}
          <button type="button" onClick={onDone} className="label ml-auto hover:text-chalk">
            ปิด
          </button>
        </div>

        <p className="mb-2 text-xs text-mute">
          {tab === "backup"
            ? "คัดลอกข้อความนี้เก็บไว้ ในนี้มีทั้งหมุดและคอมพ์ที่คุณสร้างเอง ถ้าเครื่องล้างข้อมูลเว็บ ให้เอามาวางในแท็บกู้คืน"
            : "วางข้อความที่สำรองไว้ แล้วกดกู้คืน รายการเดิมจะไม่ถูกลบ"}
        </p>

        <textarea
          ref={areaRef}
          value={text}
          readOnly={tab === "backup"}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => tab === "backup" && areaRef.current?.select()}
          rows={4}
          className="w-full resize-none rounded-md bg-ink p-2 font-mono text-xs outline-none focus:ring-1 focus:ring-edge"
        />

        {tab === "restore" && (
          <button
            type="button"
            onClick={restore}
            disabled={!text.trim()}
            className="label mt-2 rounded-md border border-edge px-3 py-2 hover:text-chalk disabled:opacity-40"
          >
            กู้คืน
          </button>
        )}

        {message && <p className="mt-2 text-xs text-cost-5">{message}</p>}
      </div>
    </div>
  );
}
