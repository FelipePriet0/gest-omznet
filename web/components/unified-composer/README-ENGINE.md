UnifiedComposer Engine Migration (Plan)

Overview

- Goal: run UnifiedComposer on a reliable rich‑text engine (Tiptap) while preserving the current external API and UI.
- Status: adapter and scaffolding are added. The app still uses the legacy composer until dependencies are installed and the flag is enabled.

How to enable (after deps)

1) Install deps (inside `web/`):
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-mention @tiptap/extension-placeholder --save

2) Set env flag:
   NEXT_PUBLIC_COMPOSER_ENGINE=tiptap

3) Replace imports to go through the adapter (optional):
   From:  @/components/unified-composer/UnifiedComposer
   To:    @/components/unified-composer/adapter

   The adapter preserves the same exports and will choose the engine by flag.

Notes

- No runtime change until the flag is set. The legacy editor continues to work.
- The Tiptap implementation mirrors the public API: props/callbacks and handle methods.
- Mention/Slash popovers remain compatible with the existing dropdowns.

