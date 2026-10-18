# AGENTS.md

Reference guide for working in this repository (humans and agents).

## What it is

`tiny-modal-dialog`: a TypeScript modal-window module with fewer settings, **zero
runtime dependencies**, no Bootstrap, and some targeted improvements (DOM nodes
not cloned, `setContent()`, `movable`, Enter to submit).

## Commands

| Command | What it does |
|---|---|
| `npm install` | Installs development dependencies |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | `eslint src` + `prettier --check src` |
| `npm run format` | `eslint --fix src` + `prettier --write src` |
| `npm test` | Full suite (vitest + jsdom) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run build` | lint + tsup (ESM + CJS + d.ts) + SCSS → `dist/` |
| `npm run dev` | Vite: serves `examples/` with HMR (opens `/examples/index.html`) |

**Always** run `npm run typecheck`, `npm run lint` and `npm test` before
considering a change done.

## Structure

```
src/
  index.ts      # public exports (Modal + types)
  modal.ts      # Modal class (core)
  emitter.ts    # own EventEmitter (on/once/off/emit)
  dom.ts        # DOM helpers (build, scrollbar, resolve element)
  styles/
    modal.scss  # self-contained SCSS, mtmodal-* namespace, no Bootstrap
test/           # vitest tests (.test.ts)
examples/       # Vite-served demo (`npm run dev`), imports `src/` directly
docs/
  PLAN.md         # development plan with Done/Todo checklist
  ARCHITECTURE.md # internal design
  API.md          # public API reference
```

## Conventions

- **Language**: everything (code, identifiers, comments, docs, commit messages)
  in English.
- **TypeScript**: `strict: true`. No `any` unless justified; use public types
  exported from `src/index.ts`.
- **Zero runtime dependencies**: do not add libs to `dependencies`.
  Node's `events` is NOT used: the emitter is our own (`src/emitter.ts`).
- **CSS namespace**: all classes use the `mtmodal-` prefix
  (`mtmodal`, `mtmodal-dialog`, `mtmodal-content`, …). Never loose generic names
  like `show` or `close` outside the prefix.
- **DOM references**: when a DOM node is passed (title/content/footer), insert
  the real node (`replaceChildren`/`append`), **never** copy it via
  `innerHTML = node.outerHTML` (that clones and loses listeners/state).
- **Code style**: no unnecessary comments in code; self-explanatory names.
  Follow the style of the existing file when editing.
- **Compatibility**: keep the public API stable (methods, options, events —
  see `docs/ARCHITECTURE.md` and `docs/API.md`).

## Public API rules (do not break without updating docs)

- `new Modal(options)` · `show()` · `hide()` · `toggle()` — return `this`.
- Events: `show`, `shown`, `hide`, `hidden`, `dismiss`, `submit`, `showBackdrop`.
  Signature: `(modal, event?)`; for `dismiss`: `(modal, event, button|null)`.
- Options: `el, animate, backdrop, keyboard, title, header, content, footer,
  headerClose, appendTo, movable, theme, strings`.
- `setContent(content)` accepts `string | Node | false`.
- public `visible` getter; statics `Modal.alert()`, `Modal.confirm()`,
  `Modal.getInstance(el)`, `Modal.version`, `Modal.strings` (get/set),
  `Modal.resetStrings()`.

## Project status

Progress lives in `docs/PLAN.md` (Done/Todo checklist). When finishing each
phase: tick the checkboxes, add a note to the status table, and reflect API
changes in `docs/API.md` and `docs/ARCHITECTURE.md`.
