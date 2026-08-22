"use client";

import { exportMine, importMine } from "./mycomps";
import { exportPins, importPins } from "./pins";

/**
 * Everything this device holds that the artifact does not: the pinned list
 * and the comps the player wrote. Both live in localStorage, which iOS
 * evicts for sites that go unused, so this is the only way back.
 *
 * v1 backups were a bare array of pinned ids. They still restore - a backup
 * format that stops reading its own old files is not a backup format.
 */
const VERSION = 2;

interface Backup {
  v: number;
  pins: string[];
  comps: unknown[];
}

export function exportAll(): string {
  const backup: Backup = {
    v: VERSION,
    pins: JSON.parse(exportPins()) as string[],
    comps: exportMine(),
  };
  return JSON.stringify(backup);
}

export function importAll(json: string): { pins: number; comps: number } {
  const parsed: unknown = JSON.parse(json);

  if (Array.isArray(parsed)) {
    return { pins: importPins(json), comps: 0 };
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
  }

  const backup = parsed as Partial<Backup>;
  if (!Array.isArray(backup.pins) && !Array.isArray(backup.comps)) {
    throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
  }

  return {
    pins: Array.isArray(backup.pins) ? importPins(JSON.stringify(backup.pins)) : 0,
    comps: importMine(backup.comps),
  };
}
