"use client";

// Adapter that preserves the existing UnifiedComposer API and chooses the engine
// based on NEXT_PUBLIC_COMPOSER_ENGINE. Default is the legacy implementation.

import type {
  ComposerDecision,
  ComposerMention,
  ComposerValue,
  UnifiedComposerHandle,
} from "./UnifiedComposer";

export type { ComposerDecision, ComposerMention, ComposerValue, UnifiedComposerHandle };

type Props = React.ComponentProps<typeof LegacyComposer>;
import LegacyComposer from "./UnifiedComposer";
import React from "react";

let EngineComposer: React.ComponentType<Props> | null = null;

const engine = (process.env.NEXT_PUBLIC_COMPOSER_ENGINE || "legacy").toLowerCase();
if (engine === "tiptap") {
  try {
    // Dynamically require to avoid build-time crashes when deps are not installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    EngineComposer = require("./UnifiedComposer.tiptap").default as React.ComponentType<Props>;
  } catch (_e) {
    EngineComposer = null;
  }
}

export default function UnifiedComposerAdapter(props: Props) {
  if (EngineComposer) {
    return <EngineComposer {...props} />;
  }
  return <LegacyComposer {...props} />;
}

