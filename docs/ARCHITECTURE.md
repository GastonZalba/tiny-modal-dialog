# Architecture — modal-ts

Internal design of the module. The public API is detailed in `API.md`; the
implementation status in `PLAN.md`.

## Goals

1. Simple, documented API (constructor, methods, options, events) with fewer
   settings.
2. **Zero runtime dependencies** (own emitter, no Node's `events`, no jQuery, no Bootstrap).
3. **Respect DOM node references** passed by the user (no cloning).
4. Own SCSS with the `mtmodal-*` namespace.
5. `movable`: header drag that removes the backdrop.

## Modules

| Module | Responsibility |
|---|---|
| `src/emitter.ts` | Minimal EventEmitter: `on`, `once`, `off`, `emit`, `removeAllListeners`. No dependencies. |
| `src/dom.ts` | Pure helpers: `build(html)` (parses a string to a node), `calcScrollbarWidth()`, `resolveElement(el)` (selector string → HTMLElement, error if missing). |
| `src/modal.ts` | `Modal` class: options, render/mapping, UI events, backdrop, scrollbar, keyboard, drag. |
| `src/index.ts` | Re-exports `Modal` and public types. |
| `src/styles/modal.scss` | Self-contained styles with `!default` variables. |

## Generated DOM structure (construct mode)

```
<body>
  ├── <div class="mtmodal [mtmodal-fade] [mtmodal-movable] [mtmodal-dark|mtmodal-auto]">  ← container (fixed, covers viewport)
  │     └── <div class="mtmodal-dialog">                          ← dialog (width, centered)
  │           └── <div class="mtmodal-content">
  │                 ├── <div class="mtmodal-header">              ← drag handle if movable
  │                 │     ├── [title: string → <h4 class="mtmodal-title"> | Node → the node as-is]
  │                 │     └── [<button class="mtmodal-close" data-mt-dismiss="modal">×</button>]
  │                 ├── <div class="mtmodal-body">                ← content (string → innerHTML | Node → inserted as-is)
  │                 └── <div class="mtmodal-footer">              ← footer (true → Cancel/OK | string | Node)
  │                       ├── <button type="button" class="mtmodal-btn mtmodal-btn-default" data-mt-dismiss="modal">Cancel</button>
  │                       └── <button type="button" class="mtmodal-btn mtmodal-btn-primary" data-mt-dismiss="modal">OK</button>
  └── <div class="mtmodal-backdrop [mtmodal-fade] [mtmodal-dark|mtmodal-auto]"></div>  ← only if backdrop !== false and !movable
```

**`el` mode (existing element)**: nothing is built; the parts are mapped by
querying `mtmodal-*` inside the given element. If the element has the
`mtmodal-fade` class, `animate` is implicitly enabled.

## Content insertion (key design decision)

| Input | How it is inserted |
|---|---|
| `string` | `body.innerHTML = string` |
| `Node` | `body.replaceChildren(node)` ← **moves the real node, keeps listeners** |

The same applies to `title` and `footer`. `setContent()` at runtime uses the same
logic and accepts `false` to clear.

## Lifecycle and events

```
show()  ──► emit('show')
        ──► appendTo.appendChild(container)   [construct mode only]
        ──► container.style.display = 'block'
        ──► backdrop if backdrop !== false and !movable:
              create backdrop ──► setTimeout(backdropTransition=150ms) ──► emit('showBackdrop')
        ──► (after backdrop ready) reflow ──► class mtmodal-show
        ──► setTimeout(transition=300ms) ──► visible=true ──► emit('shown')

hide()  ──► emit('hide')
        ──► remove class mtmodal-show
        ──► removeEventListener of all handlers
        ──► setTimeout(150ms) ──► clean body (modal-open, padding-right)
        ──► setTimeout(300ms) ──► remove backdrop; container display:none
                                   (and detach it from the DOM if it was construct)
        ──► visible=false ──► emit('hidden')

dismiss (click on [data-mt-dismiss] or outside click with backdrop:true)
        ──► emit('dismiss', modal, event, button|null) ──► hide()
```

The input listeners (`keydown` on `document.body`, `click` on container,
`pointerdown` on header if movable, `resize` on window) are registered in
`show()` and removed in `hide()` (guard against double registration).

## Keyboard (`keyboard: true` by default)

| Key | Action |
|---|---|
| `Escape` | `emit('dismiss', modal, event, null)` + `hide()` |
| `Enter` | `emit('submit', modal, event)`; if there is a `<form>` (in the focused path or inside the content), it is submitted with `form.requestSubmit()` |

Enter guards (do not intercept): `textarea`, `contenteditable` elements,
focus on `button`/`a` (the browser already handles activation), and
`e.isComposing` (IME). `e.repeat` is ignored.

## Backdrop

- `true` (default): a click on the container outside the dialog closes the
  modal (`dismiss`). A `.mtmodal-backdrop` element is created for the visual
  effect.
- `'static'`: visible backdrop, outside click does **not** close.
- `false`: no backdrop and no close on outside click.
- `movable: true`: forces `backdrop: false` (no backdrop, no close on outside click).

## Movable

- Only with `movable: true`: the container receives `mtmodal-movable`; backdrop disabled.
- Same initial centering (flex/transform). On `pointerdown` over the header:
  1. `setPointerCapture`, class `mtmodal-dragging` (cursor grabbing, `user-select: none`).
  2. On the first `pointermove` with delta: switch to free positioning
     (`left/top` in px on the **dialog**, `transform: none`).
  3. `pointerup`: release capture, remove the class.
- Clamp to the viewport on every move and on window `resize` (the dialog must
  stay inside the viewport; if it is larger than the viewport, it is anchored at 0).
- `touch-action: none` on the header for touch/pen.

## Body scrollbar

On `show()` the scrollbar width is measured (`calcScrollbarWidth`),
`mtmodal-open` is added to the body with compensating padding; it is restored
on `hide()`.

## Technical decisions

- **Transitions**: fixed (300ms content, 150ms backdrop) with `setTimeout`,
  in a backdrop → show sequence.
- **Instance in `el` mode**: `WeakMap<HTMLElement, Modal>` for
  `Modal.getInstance(el)`.
- **Loose typed emitter**: events by string, handlers `(...args: any[]) => void`;
  the concrete signature is documented per event (signature compatibility
  controlled in tests).
- **No CSS build in JS**: the CSS is packaged separately
  (`dist/modal.css`); the consumer imports it. Avoids runtime injection.
- **i18n**: the text the library generates (`ok`, `cancel`, `close`) lives in
  `ModalStrings`. A module-level `globalStrings` object holds the defaults
  (`DEFAULT_STRINGS`) overridable via `Modal.strings` (merging setter) and
  `Modal.resetStrings()`. Each instance resolves `{ ...globalStrings,
  ...options.strings }` once in the constructor (`_strings`), so the per-instance
  override wins. `title`/`content`/`message` are not translated here: they are
  provided by the caller, so they are localized at the point of use.
- **Theming**: theme-dependent colors are exposed as CSS variables
  (`--mtmodal-*`) defined in `:root` (light values from SCSS `!default`
  variables). The dark theme is defined with `@mixin mtmodal-theme-dark`, applied
  by the `.mtmodal-dark` / `[data-mtmodal-theme="dark"]` selectors, and with
  `@media (prefers-color-scheme: dark)` for `.mtmodal-auto` /
  `[data-mtmodal-theme="auto"]`. The `theme` option adds the corresponding class
  to the container and the backdrop (so both inherit the variables), but the CSS
  can be used on its own by placing the class/attribute on an ancestor.
