# modal-ts

Modal windows in **TypeScript** with small configuration, **zero runtime
dependencies** and no Bootstrap.

## Features

- Simple API: `new Modal(options)`, `show()`, `hide()`, `toggle()` and the
  `show`, `shown`, `hide`, `hidden`, `dismiss`, `showBackdrop` and `submit` events.
- **DOM nodes respected**: if you pass a `Node` as `title`, `content` or
  `footer`, the real node is inserted (not cloned), keeping listeners and state.
- `setContent()` to change the content at runtime.
- `keyboard`: `Esc` closes and `Enter` emits `submit` and submits a `<form>` if present.
- `movable`: window draggable from the header, no backdrop.
- Self-contained **SCSS** CSS with the `mtmodal-*` namespace (no Bootstrap).
- Own emitter (no Node's `events`).

## Installation

```bash
npm install modal-ts
```

## Usage

```ts
import { Modal } from 'modal-ts';
import 'modal-ts/modal.css';

const modal = new Modal({
  title: 'Hello',
  content: 'Dynamic content'
});

modal.on('shown', () => console.log('visible'));
modal.show();
```

CommonJS:

```js
const { Modal } = require('modal-ts');
```

### Over existing HTML

```html
<div class="mtmodal mtmodal-fade" id="my-modal">
  <div class="mtmodal-dialog">
    <div class="mtmodal-content">
      <div class="mtmodal-header">
        <h4 class="mtmodal-title">Title</h4>
        <button type="button" class="mtmodal-close" data-mt-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="mtmodal-body">Content</div>
      <div class="mtmodal-footer">
        <button type="button" class="mtmodal-btn mtmodal-btn-primary" data-mt-dismiss="modal">OK</button>
      </div>
    </div>
  </div>
</div>
```

```ts
const modal = new Modal({ el: '#my-modal' });
modal.show();
```

### Node with listeners (not cloned)

```ts
const form = document.createElement('form');
form.addEventListener('submit', (e) => { e.preventDefault(); /* ... */ });

const modal = new Modal({ title: 'Edit', content: form });
// The listener stays alive: Enter inside the form triggers 'submit'.
```

### Movable

```ts
const modal = new Modal({ title: 'Window', content: '...', movable: true });
// No backdrop; drag from the header.
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `el` | `HTMLElement \| string \| null` | `null` | Existing element to "modalize" (node or selector). |
| `animate` | `boolean` | `true` | Show with animation. |
| `backdrop` | `boolean \| 'static'` | `true` | `'static'`: does not close on outside click. `false`: no backdrop. |
| `keyboard` | `boolean` | `true` | `Esc` closes; `Enter` emits `submit` and submits `<form>`. |
| `title` | `string \| Node \| false` | `false` | Header title. |
| `header` | `boolean` | `true` | Render the header. |
| `content` | `string \| Node \| false` | `false` | Body content. |
| `footer` | `boolean \| string \| Node` | `true` | `true`: Cancel/OK buttons. |
| `headerClose` | `boolean` | `true` | Close button in the header. |
| `appendTo` | `string \| HTMLElement` | `'body'` | Where to mount the constructed modal. |
| `movable` | `boolean` | `false` | Draggable from the header; removes the backdrop. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | Visual theme (see below). |
| `strings` | `Partial<ModalStrings>` | `{}` | Built-in strings (`ok`, `cancel`, `close`). |

## Methods

| Method | Description |
|---|---|
| `show()` | Shows the modal. Returns `this`. |
| `hide()` | Hides the modal. Returns `this`. |
| `toggle()` | Toggles. Returns `this`. |
| `setContent(content)` | Changes the body (`string \| Node \| false`). Returns `this`. |
| `visible` | Getter: `true` when fully visible. |

### Statics

| Member | Description |
|---|---|
| `Modal.alert(message, options?)` | Preset with a message and an **OK** button. |
| `Modal.confirm(question, options?)` | Preset with a question and **Cancel**/**OK** buttons. |
| `Modal.strings` | Getter/setter for the global strings (`{ ok, cancel, close }`). |
| `Modal.resetStrings()` | Restores the default strings (English). |
| `Modal.getInstance(el)` | Instance associated with an element (`el`), or `null`. |
| `Modal.version` | Package version. |

## Presets

### `Modal.confirm`

```ts
const dialog = Modal.confirm('Delete the record?');

dialog.on('dismiss', (_modal, _event, button) => {
  if (button?.value === true) {
    // OK pressed
    deleteRecord();
  } else if (button?.value === false) {
    // Cancel pressed
  } else {
    // button === null: closed with Esc or clicking outside
  }
});

dialog.show();
```

The `dismiss` event fires in every closing path with the last argument
indicating which button closed it:

| Closing path | `button` |
|---|---|
| **OK** clicked | `{ text: 'OK', value: true }` |
| **Cancel** clicked | `{ text: 'Cancel', value: false }` |
| `Esc` or click outside | `null` |

Optional promise-style wrapper:

```ts
function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = Modal.confirm(question);
    dialog.on('dismiss', (_modal, _event, button) => resolve(button?.value === true));
    dialog.show();
  });
}

if (await confirm('Overwrite the file?')) saveFile();
```

### `Modal.alert`

```ts
Modal.alert('Saved successfully').show();
```

### Options in presets

Both accept `options` to override any default (`title`,
`content`, `footer`, `headerClose`, `keyboard`, `movable`, …):

- `Modal.alert(message, options?)`: `title = message`, no close button,
  a single **OK** button (`value: true`).
- `Modal.confirm(question, options?)`: `title = question`, no close button,
  **Cancel** (`value: false`) and **OK** (`value: true`) buttons.

## Translation (i18n)

The built-in strings (`OK`, `Cancel`, `Close`) can be translated globally or
per instance.

```ts
// Global: affects instances created from now on.
Modal.strings = { ok: 'Accept', cancel: 'Cancel', close: 'Dismiss' };

// Per instance (overrides the global).
new Modal({
  title: 'Edit',
  content: '...',
  strings: { ok: 'Save', cancel: 'Discard' }
});
```

```ts
Modal.strings;          // { ok: 'Accept', cancel: 'Cancel', close: 'Dismiss' }
Modal.resetStrings();   // back to { ok: 'OK', cancel: 'Cancel', close: 'Close' }
```

`title`/`content`/`message` are provided by the caller, so translate them at the
point of use; `strings` only covers the text the library generates.

## Themes (light / dark)

Colors are exposed as CSS variables (`--mtmodal-bg`, `--mtmodal-color`,
`--mtmodal-border-color`, `--mtmodal-shadow`, `--mtmodal-btn-*`,
`--mtmodal-backdrop-*`), so the theme can be changed without recompiling.

**Per modal** with the `theme` option:

```ts
new Modal({ content: '...', theme: 'dark' }).show(); // 'light' | 'dark' | 'auto'
```

`'auto'` follows the operating system's `prefers-color-scheme`.

**Global** with a class or attribute on an ancestor (`<html>`/`<body>`):

```html
<body data-mtmodal-theme="dark">
  <!-- or class="mtmodal-dark" -->
</body>
```

```html
<body data-mtmodal-theme="auto">
  <!-- follows the system preference -->
</body>
```

The three available selectors are `.mtmodal-dark`, `[data-mtmodal-theme="dark"]`,
`.mtmodal-auto` and `[data-mtmodal-theme="auto"]`, both globally and on the modal
container itself.

### Customizing the theme

By recompiling the SCSS you can override the variables before importing:

```scss
$mtmodal-dark-bg: #101010;
@use 'modal-ts/src/styles/modal';
```

At runtime, define CSS variables on any ancestor:

```css
[data-mtmodal-theme='dark'] {
  --mtmodal-bg: #101010;
  --mtmodal-color: #f1f3f5;
}
```

## Events

Emitter methods: `on`, `once`, `off` (alias `removeListener`),
`removeAllListeners`, `emit`, `listenerCount`.

| Event | Signature | When |
|---|---|---|
| `show` | `(modal)` | As soon as `show()` is called. |
| `shown` | `(modal)` | When the show animation finishes. |
| `hide` | `(modal)` | As soon as `hide()` is called or it closes. |
| `hidden` | `(modal)` | When it finishes hiding. |
| `dismiss` | `(modal, event, button)` | Click on `[data-mt-dismiss]`, outside click (backdrop `true`) or `Esc`. `button` is `{ text, value }` or `null`. |
| `submit` | `(modal, event)` | `Enter` with `keyboard` active. |
| `showBackdrop` | `(modal)` | Backdrop shown (mostly internal). |

```ts
modal.on('dismiss', (modal, event, button) => {
  if (button?.value === true) console.log('Confirmed');
});
```

## Highlights

- DOM nodes are **not cloned**: if you pass a `Node` as `title`, `content` or
  `footer`, the real node is inserted, keeping listeners and state.
- Adds `setContent()`, `movable`, `visible`, `theme`, `Modal.getInstance()`
  and built-in string translation (`strings` / `Modal.strings`).
- Class namespace `mtmodal-*` and attribute `data-mt-dismiss`.
- Fixed transitions (300ms content, 150ms backdrop).
- Own emitter instead of Node's `events`.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

### View the example

```bash
npm run dev
```

Starts a **Vite** server over the project root and opens
`http://localhost:5173/examples/index.html`. The example imports `src/`
directly, so it has **HMR** when editing code or styles (no `npm run build`
needed).

See `docs/PLAN.md`, `docs/ARCHITECTURE.md` and `docs/API.md` for more detail.
