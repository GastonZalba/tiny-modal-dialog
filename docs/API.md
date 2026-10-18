# API — modal-ts

Complete reference of the public API. Everything is exported from `modal-ts`.

```ts
import { Modal } from 'modal-ts';
import type { ModalOptions, ModalContent, ModalButton, ModalStrings, ModalTheme, ModalEvents } from 'modal-ts';
```

## Types

```ts
type ModalContent = string | Node | false;
type ModalTheme = 'light' | 'dark' | 'auto';

interface ModalButton {
  text: string;
  value: boolean;
}

interface ModalStrings {
  ok: string;      // default: 'OK'
  cancel: string;  // default: 'Cancel'
  close: string;   // default: 'Close' (aria-label of the close button)
}

interface ModalOptions {
  el?: HTMLElement | string | null;
  animate?: boolean;            // default: true
  backdrop?: boolean | 'static'; // default: true
  keyboard?: boolean;           // default: true
  title?: string | Node | false; // default: false
  header?: boolean;             // default: true
  content?: ModalContent;       // default: false
  footer?: boolean | string | Node; // default: true
  headerClose?: boolean;        // default: true
  appendTo?: string | HTMLElement; // default: 'body'
  movable?: boolean;            // default: false
  theme?: ModalTheme;           // default: 'light'
  strings?: Partial<ModalStrings>; // default: {}
}
```

## Constructor

```ts
new Modal(options?: ModalOptions)
```

- If `el` is present (node or selector), the modal **maps** the existing DOM.
  If `el` is a selector and does not exist, throws `Error`.
- If `el` is not present, the modal is **built** dynamically.
- If `appendTo` (selector) does not exist, throws `Error`.

## Options

### `el`
`HTMLElement | string | null` — default `null`.
Existing element to modalize. The parts are mapped by class (`mtmodal-dialog`,
`mtmodal-content`, `mtmodal-header`, `mtmodal-close`, `mtmodal-body`,
`mtmodal-footer`). If the element has the `mtmodal-fade` class, `animate` is
enabled.

### `animate`
`boolean` — default `true`.
Adds the `mtmodal-fade` class and animates the appearance (300 ms).

### `backdrop`
`boolean | 'static'` — default `true`.

| Value | Backdrop visible | Outside click closes |
|---|---|---|
| `true` | Yes | Yes |
| `'static'` | Yes | No |
| `false` | No | No |

With `movable: true`, the backdrop is forced to `false`.

### `keyboard`
`boolean` — default `true`. Enables keyboard handling:

| Key | Action |
|---|---|
| `Escape` | Emits `dismiss` and closes. |
| `Enter` | Emits `submit`; if there is a `<form>` (in the focused element or inside the body) it submits it with `requestSubmit()`. |

`Enter` is not intercepted when focus is inside a `<textarea>`, a
`contenteditable` element, a `<button>`/`<a>`, or during IME composition.

### `title`
`string | Node | false` — default `false`.
- `string`: renders an `<h4 class="mtmodal-title">` with the text.
- `Node`: inserts the node **as-is** (not cloned).
- `false`: leaves the title untouched.

### `header`
`boolean` — default `true`. Renders the header (construct mode only).

### `content`
`string | Node | false` — default `false`.
- `string`: assigned to `body.innerHTML`.
- `Node`: inserts the node **as-is** (keeps listeners).
- `false`: empty body.

### `footer`
`boolean | string | Node` — default `true`.
- `true`: default **Cancel** (`false`) and **OK** (`true`) buttons, with
  `data-mt-dismiss="modal"`.
- `string`: footer HTML.
- `Node`: inserts the node **as-is**.
- `false`: no footer.

### `headerClose`
`boolean` — default `true`. Shows/creates the close button (construct mode).

### `appendTo`
`string | HTMLElement` — default `'body'`. Destination where the constructed
modal is mounted.

### `movable`
`boolean` — default `false`. Window draggable from the header, no backdrop.
The position is re-centered on every `show()`. The dialog is clamped to the viewport.

### `theme`
`ModalTheme` — default `'light'`. Applies a visual theme.

| Value | Effect |
|---|---|
| `'light'` | No extra class; uses the default light theme. |
| `'dark'` | Adds `mtmodal-dark` to the container and the backdrop. |
| `'auto'` | Adds `mtmodal-auto`; follows `prefers-color-scheme`. |

The theme can also be set globally without JS, by adding
`.mtmodal-dark`/`.mtmodal-auto` or `[data-mtmodal-theme="dark"|"auto"]` to an
ancestor (`<html>`/`<body>`).

### `strings`
`Partial<ModalStrings>` — default `{}`.
Translates the built-in strings. It is combined with the global defaults
(`Modal.strings`) and, per instance, overrides them.

```ts
interface ModalStrings {
  ok: string;      // OK button (default footer, alert, confirm)
  cancel: string;  // Cancel button (default footer, confirm)
  close: string;   // aria-label of the header close button
}
```

`title`/`content`/`message` are provided by the API caller, so they are
translated at the point of use.

## Instance methods

```ts
show(): this
hide(): this
toggle(): this
setContent(content: ModalContent): this
get visible(): boolean
```

- `show()` — emits `show`, mounts (if construct), shows the backdrop, animates
  and emits `shown` when done. Idempotent while active.
- `hide()` — emits `hide`, reverts classes, removes listeners, cleans the body
  and emits `hidden` when done.
- `setContent(content)` — replaces the body at runtime; accepts `string | Node | false`.
  A `Node` is not cloned.
- `visible` — `true` when the show animation has finished.

## Static members

```ts
Modal.getInstance(el: HTMLElement): Modal | null
Modal.version: string
Modal.strings: ModalStrings
Modal.resetStrings(): void
Modal.alert(message: string, options?: ModalOptions): Modal
Modal.confirm(question: string, options?: ModalOptions): Modal
```

### `Modal.strings` / `Modal.resetStrings()`

Getter that returns a copy of the global strings; setter that **merges** the
provided values onto the current ones. `resetStrings()` goes back to the English
defaults.

```ts
Modal.strings = { ok: 'Accept', cancel: 'Cancel', close: 'Dismiss' };

// Instances created afterwards use the global strings.
new Modal({ content: '...' }).show();

Modal.resetStrings();
```

### `Modal.alert(message, options?)`

Preset for notices. Builds a modal with:
- `title = message`
- `headerClose: false` (no close button)
- `footer`: a single **OK** button (`{ text: 'OK', value: true }`, `data-mt-dismiss`)

`options` overrides the defaults (for example `title`, `content`, `footer`).

### `Modal.confirm(question, options?)`

Preset for confirmations. Builds a modal with:
- `title = question`
- `headerClose: false`
- `footer`: **Cancel** (`false`) and **OK** (`true`) buttons

```ts
Modal.alert('Saved').show();

const dialog = Modal.confirm('Delete?');
dialog.on('dismiss', (_modal, _event, button) => {
  if (button?.value === true) deleteRecord();
});
dialog.show();
```

## Events

The emitter methods are inherited: `on`, `once`, `off` (alias
`removeListener`), `removeAllListeners`, `emit`, `listenerCount`. All return
`this` except `emit` (boolean) and `listenerCount` (number).

```ts
interface ModalEvents {
  show:         [modal: Modal, event?: Event];
  shown:        [modal: Modal, event?: Event];
  hide:         [modal: Modal, event?: Event];
  hidden:       [modal: Modal, event?: Event];
  dismiss:      [modal: Modal, event?: Event, button?: ModalButton | null];
  submit:       [modal: Modal, event: Event];
  showBackdrop: [modal: Modal, event?: Event];
}
```

Examples:

```ts
modal.on('shown', (modal) => { /* ... */ });

modal.on('dismiss', (modal, event, button) => {
  if (button?.value === true) { /* OK */ }
  if (button?.value === false) { /* Cancel */ }
});

modal.once('hidden', () => modal.removeAllListeners());
```

## CSS

```ts
import 'modal-ts/modal.css';      // or 'modal-ts/modal.min.css'
```

Customizable SCSS variables (with `!default`): colors, `z-index`, widths,
transitions and button styles. See `src/styles/modal.scss`.

The theme colors are exposed as CSS variables, overridable at runtime from any
ancestor:

```
--mtmodal-bg                 --mtmodal-backdrop-bg
--mtmodal-color              --mtmodal-backdrop-opacity
--mtmodal-border-color       --mtmodal-btn-color
--mtmodal-shadow             --mtmodal-btn-bg
--mtmodal-btn-border         --mtmodal-btn-primary-color
--mtmodal-btn-primary-bg     --mtmodal-btn-primary-border
```

## Classes and attributes

Namespace `mtmodal-`: `mtmodal`, `mtmodal-dialog`, `mtmodal-content`,
`mtmodal-header`, `mtmodal-title`, `mtmodal-close`, `mtmodal-body`,
`mtmodal-footer`, `mtmodal-btn`, `mtmodal-btn-default`, `mtmodal-btn-primary`,
`mtmodal-backdrop`, `mtmodal-fade`, `mtmodal-show`, `mtmodal-movable`,
`mtmodal-dragging`, `mtmodal-dark`, `mtmodal-auto`. On `<body>`: `mtmodal-open`.
Close attribute: `data-mt-dismiss="modal"`. Theme attribute (ancestor):
`data-mtmodal-theme="dark" | "auto"`.
