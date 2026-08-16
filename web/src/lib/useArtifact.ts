"use client";

import { useEffect, useState } from "react";
import { Artifact, SCHEMA_VERSION } from "./types";

type State =
  | { status: "loading" }
  | { status: "ready"; data: Artifact }
  | { status: "error"; message: string };

/** Loads the published artifact and refuses anything it cannot read. */
export function useArtifact(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${basePath()}/data/comps.json`, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Artifact = await res.json();

        const v = data?.meta?.schema_version;
        if (v !== SCHEMA_VERSION) {
          throw new Error(
            `ข้อมูลเป็น schema v${v} แต่แอปนี้รองรับ v${SCHEMA_VERSION} — โปรดอัปเดตแอป`,
          );
        }
        if (!cancelled) setState({ status: "ready", data });
      } catch (e) {
        if (!cancelled) {
          setState({ status: "error", message: (e as Error).message });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Works both at the domain root and under a GitHub Pages sub-path. */
export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}
