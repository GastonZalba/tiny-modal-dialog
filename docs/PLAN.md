# Development plan — modal-ts

Phase-by-phase implementation plan. It is updated on every delivery:
checkbox `[x]` = done, `[ ]` = pending. The status column summarizes progress.

## Overall status

| Phase | Description | Status |
|---|---|---|
| 0 | Base docs (AGENTS.md, ARCHITECTURE.md, PLAN.md) | ✅ done |
| 1 | Project setup (package.json, tsconfig, tsup, vitest) | ✅ done |
| 2 | `emitter.ts` + `dom.ts` (+ tests) | ✅ done |
| 3 | `modal.ts` core | ✅ done |
| 4 | `movable` (header drag) | ✅ done |
| 5 | SCSS `mtmodal-*` namespace | ✅ done |
| 6 | Full test suite | ✅ done |
| 7 | Build (ESM+CJS+d.ts+css) and exports | ✅ done |
| 8 | examples/, README.md, API.md | ✅ done |
| 9 | Wrap-up: final plan status | ✅ done |
| 10 | Presets `Modal.alert()` / `Modal.confirm()` | ✅ done |
| 11 | i18n of built-in strings (`strings`) | ✅ done |
| 12 | Dark theme (CSS variables + `theme` option) | ✅ done |

---

## Phase 0 — Base docs

- [x] Create `AGENTS.md` (commands, structure, conventions)
- [x] Create `docs/ARCHITECTURE.md` (design, DOM, events, compatibility)
- [x] Create `docs/PLAN.md` (this file)

## Phase 1 — Setup

- [x] `package.json` (name `modal-ts`, type module, scripts, exports)
- [x] `tsconfig.json` (strict, DOM libs, outDir typecheck)
- [x] `tsup.config.ts` (entry `src/index.ts`, ESM + CJS + dts)
- [x] `vitest.config.ts` (environment jsdom, include `test/**/*.test.ts`)
- [x] Dev dependencies: typescript, tsup, vitest, jsdom, sass
- [x] `npm run typecheck` and `npm test` pass with an empty scaffold

> Note: the environment uses **Node 20.10**, so compatible versions were pinned:
> `vitest@^3`, `jsdom@24`, `tsup@^8`, `typescript@^5.9`
> (the current majors require Node ≥20.12 / use ESM-only deps that break
> `require()` on 20.10). The CSS is compiled with the sass ESM API
> (`scripts/build-css.mjs`), not the sass CLI (chokidar@4 ESM).
> Verified: `typecheck` ✓ · `test` ✓ · `build` ✓ (ESM+CJS+d.ts+css).

## Phase 2 — Emitter and DOM helpers

- [ ] `src/emitter.ts`: `on`, `once`, `off`/`removeListener`, `emit`, `removeAllListeners`; returns `this`
- [ ] `src/dom.ts`: `build()`, `calcScrollbarWidth()`, `resolveElement()`
- [ ] Tests: `test/emitter.test.ts` (on/once/off/emit/removeAllListeners, emission during a listener, errors)

## Phase 3 — Modal core

- [x] Typed `ModalOptions`: `el, animate, backdrop, keyboard, title, header, content, footer, headerClose, appendTo, movable`
- [x] Constructor: construct mode vs `el` mode (selector or node); `WeakMap` for `getInstance`
- [x] Construct render: container/dialog/content/header/close/body/footer; default footer Cancel/OK (`data-mt-dismiss`)
- [x] `el` mode mapping (query `mtmodal-*`; detects `mtmodal-fade` → animate)
- [x] Insert without cloning: `title/content/footer` as Node are inserted as-is (string → innerHTML)
- [x] Dynamic `setContent(string | Node | false)`
- [x] `show()` / `hide()` / `toggle()` with backdrop sequence (150ms) and transition (300ms); events `show, shown, hide, hidden, showBackdrop`
- [x] Backdrop `true | 'static' | false` + outside click (`dismiss`)
- [x] Click on `[data-mt-dismiss]` → `dismiss` with button payload + `hide()`
- [x] Scrollbar: `mtmodal-open` + compensating padding, restored on hide
- [x] Keyboard: ESC → dismiss+hide; Enter → `submit` + `<form>` submission with guards (textarea, contenteditable, focused button, IME, repeat)
- [x] `visible` getter; `Modal.getInstance(el)`; `Modal.version`
- [x] Listener cleanup on `hide()` (no leaks)

> Verified: `typecheck` ✓ · `test` ✓ (43 tests: emitter 12, modal 23, keyboard 8).

## Phase 4 — Movable

- [x] `movable: true` forces `backdrop: false` and adds the `mtmodal-movable` class
- [x] Pointer capture on header; free positioning `left/top` on the dialog (removes the centering `transform`)
- [x] Viewport clamp on drag and on `resize`
- [x] Visual states: `mtmodal-dragging`, `touch-action: none`, `user-select: none`
- [x] Guard: does not start the drag from buttons/links/inputs in the header
- [x] Re-centers the position on every `show()` (clears inline styles)

> Verified: `test` ✓ (movable 6 tests, total 49).

## Phase 5 — SCSS

- [x] Self-contained `src/styles/modal.scss` (no Bootstrap), `!default` variables (colors, z-index, widths, transitions)
- [x] States: hidden by default, `mtmodal-fade` + `mtmodal-show`, backdrop, header/body/footer/buttons/close
- [x] Movable styles (cursor grab/grabbing, dragging)
- [x] Compilation to `dist/modal.css` + `dist/modal.min.css` in build

> Verified: `build:css` ✓ (modal.css 3501 B, modal.min.css 2856 B).

## Phase 6 — Tests

- [x] `test/modal.test.ts`: construct, `el` (node and selector), default footer, static/false backdrop, `setContent` (string/node/false, live listeners), show/hide/dismiss events, getInstance, el mode + hide (does not detach), selector throws
- [x] `test/keyboard.test.ts`: ESC dismiss+hide; Enter emits `submit` and submits the form; guards (textarea, contenteditable, button, IME, keyboard:false)
- [x] `test/movable.test.ts`: no backdrop with movable; drag updates left/top; clamp; no drag with movable:false; drag from header
- [x] Coverage of every critical branch; `npm test` green

> Verified: `test` ✓ (49 tests: emitter 12, modal 23, keyboard 8, movable 6).

## Phase 7 — Build and packaging

- [x] tsup generates `dist/index.js` (ESM) + `dist/index.cjs` + `dist/index.d.ts` (+ `.d.cts`)
- [x] SCSS compiled to `dist/modal.css` + `.min.css`
- [x] `package.json`: `exports` (import/require/types + `./modal.css`), `files: ["dist"]`, `sideEffects: ["*.css"]`
- [x] Verify consumption from a Node script (import and require)

> Verified: self-reference `import('modal-ts')` ✓ and `require('modal-ts')` ✓
> (both `Modal.version = 0.1.0`); `modal-ts/modal.css` resolves ✓.

## Phase 8 — Examples and final docs

- [x] `examples/index.html`: demo with a dynamic modal, with `el`, form with Enter, movable, setContent at runtime
- [x] `README.md`: installation, quick start, options, methods, events
- [x] `docs/API.md`: complete reference (types, options with defaults, events with signatures)
- [x] `npm run dev` starts Vite over the root serving `examples/` with HMR (imports `src/`; see `vite.config.ts`)

## Phase 9 — Wrap-up

- [x] Review the overall status table with all changes
- [x] Note pending future work (destroy, setTitle, presets, bootstrap class flag)
- [x] Final `npm run typecheck`, `npm test`, `npm run build` green

---

## Phase 10 — Presets `alert` / `confirm`

- [x] `Modal.alert(message, options?)`: title = message, no close button, a single **OK** button (`value: true`)
- [x] `Modal.confirm(question, options?)`: title = question, no close button, **Cancel** (`false`) and **OK** (`true`) buttons
- [x] `options` overrides defaults
- [x] Buttons built with the same `createButton` helper (+ metadata for `dismiss`)
- [x] `test/presets.test.ts` (6 tests)

> Verified: `typecheck` ✓ · `test` ✓ (55 tests) · documented in `README.md` and `docs/API.md`.

---

## Phase 11 — i18n of built-in strings

- [x] Types: `ModalStrings { ok, cancel, close }` and `ModalOptions.strings?: Partial<ModalStrings>`
- [x] English defaults (`OK`, `Cancel`, `Close`) + global state `globalStrings`
- [x] Statics `Modal.strings` (copy getter / merging setter) and `Modal.resetStrings()`
- [x] `resolveStrings()` combines global + `options.strings`; the instance stores `_strings`
- [x] Default footer, `Modal.alert` and `Modal.confirm` use the resolved strings
- [x] `aria-label` of the close button set from `strings.close` (construct mode only)
- [x] Export `ModalStrings` from `src/index.ts`
- [x] `test/i18n.test.ts` (9 tests)

> Verified: `typecheck` ✓ · `test` ✓ (64 tests) · documented in `README.md`, `docs/API.md` and `docs/ARCHITECTURE.md`.

---

## Phase 12 — Dark theme

- [x] Theme colors converted to CSS variables `--mtmodal-*` listed in `:root`
- [x] SCSS mixin `mtmodal-theme-dark` with `$mtmodal-dark-*` variables (`!default`)
- [x] Selectors `.mtmodal-dark`/`[data-mtmodal-theme="dark"]` and `.mtmodal-auto`/`[data-mtmodal-theme="auto"]`
- [x] `@media (prefers-color-scheme: dark)` for automatic mode
- [x] `ModalTheme` type (`'light' | 'dark' | 'auto'`) and `theme` option (default `'light'`)
- [x] `_applyTheme()` adds the class to the container and the backdrop
- [x] Export `ModalTheme` from `src/index.ts`
- [x] `test/theme.test.ts` (6 tests)

> Verified: `typecheck` ✓ · `test` ✓ (70 tests) · `build:css` ✓ · documented in `README.md`, `docs/API.md` and `docs/ARCHITECTURE.md`.

---

## Future (post-v1)

- `destroy()` to clean up the instance and events.
- Dynamic `setTitle()`.
- Option to use Bootstrap classes as an alternative to the own namespace.
- Footer button customization (simplified `buttons` option).
