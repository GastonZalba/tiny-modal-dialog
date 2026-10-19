// src/dom.ts
var factory = null;
function build(html) {
  if (!factory) factory = document.createElement("div");
  factory.innerHTML = html.trim();
  const node = factory.firstElementChild;
  if (!node) throw new Error(`tiny-modal-dialog: invalid markup "${html}"`);
  factory.innerHTML = "";
  return node;
}
function resolveElement(el) {
  if (typeof el === "string") {
    return document.querySelector(el);
  }
  return el;
}
function calcScrollbarWidth() {
  const outer = document.createElement("div");
  Object.assign(outer.style, {
    visibility: "hidden",
    width: "100px"
  });
  document.body.appendChild(outer);
  const outerWidth = outer.offsetWidth;
  outer.style.overflow = "scroll";
  const inner = document.createElement("div");
  inner.style.width = "100px";
  outer.appendChild(inner);
  const width = outerWidth - inner.offsetWidth;
  document.body.removeChild(outer);
  return width > 0 ? width : 0;
}

// src/emitter.ts
var Emitter = class {
  constructor() {
    this._listeners = /* @__PURE__ */ new Map();
  }
  on(event, listener) {
    const list = this._listeners.get(event);
    if (list) {
      list.push({ fn: listener, once: false });
    } else {
      this._listeners.set(event, [{ fn: listener, once: false }]);
    }
    return this;
  }
  once(event, listener) {
    const list = this._listeners.get(event);
    if (list) {
      list.push({ fn: listener, once: true });
    } else {
      this._listeners.set(event, [{ fn: listener, once: true }]);
    }
    return this;
  }
  off(event, listener) {
    const list = this._listeners.get(event);
    if (!list) return this;
    if (!listener) {
      this._listeners.delete(event);
      return this;
    }
    const index = list.findIndex((entry) => entry.fn === listener);
    if (index !== -1) list.splice(index, 1);
    if (list.length === 0) this._listeners.delete(event);
    return this;
  }
  removeListener(event, listener) {
    return this.off(event, listener);
  }
  removeAllListeners(event) {
    if (event === void 0) {
      this._listeners.clear();
    } else {
      this._listeners.delete(event);
    }
    return this;
  }
  emit(event, ...args) {
    const list = this._listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const entry of [...list]) {
      if (entry.once) this.off(event, entry.fn);
      entry.fn(...args);
    }
    return true;
  }
  listenerCount(event) {
    return this._listeners.get(event)?.length ?? 0;
  }
};

// src/modal.ts
var TRANSITION = 300;
var BACKDROP_TRANSITION = 150;
var CLASS = {
  container: "mtmodal",
  dialog: "mtmodal-dialog",
  content: "mtmodal-content",
  header: "mtmodal-header",
  title: "mtmodal-title",
  close: "mtmodal-close",
  body: "mtmodal-body",
  footer: "mtmodal-footer",
  backdrop: "mtmodal-backdrop",
  button: "mtmodal-btn",
  buttonDefault: "mtmodal-btn-default",
  buttonPrimary: "mtmodal-btn-primary",
  fade: "mtmodal-fade",
  show: "mtmodal-show",
  movable: "mtmodal-movable",
  dragging: "mtmodal-dragging",
  open: "mtmodal-open",
  themeDark: "mtmodal-dark",
  themeAuto: "mtmodal-auto"
};
var TEMPLATES = {
  container: `<div class="${CLASS.container}"></div>`,
  dialog: `<div class="${CLASS.dialog}"></div>`,
  content: `<div class="${CLASS.content}"></div>`,
  header: `<div class="${CLASS.header}"></div>`,
  headerClose: `<button type="button" class="${CLASS.close}" data-mt-dismiss="modal"><span aria-hidden="true">&times;</span></button>`,
  body: `<div class="${CLASS.body}"></div>`,
  footer: `<div class="${CLASS.footer}"></div>`,
  backdrop: `<div class="${CLASS.backdrop}"></div>`
};
var DEFAULT_STRINGS = {
  ok: "OK",
  cancel: "Cancel",
  close: "Close"
};
var DEFAULTS = {
  el: null,
  animate: true,
  backdrop: true,
  keyboard: true,
  title: false,
  header: true,
  content: false,
  footer: true,
  headerClose: true,
  appendTo: "body",
  movable: false,
  theme: "light",
  strings: {}
};
var globalStrings = { ...DEFAULT_STRINGS };
var buttonMeta = /* @__PURE__ */ new WeakMap();
var instances = /* @__PURE__ */ new WeakMap();
var uid = 0;
function resolveStrings(override) {
  return { ...globalStrings, ...override };
}
function createButton(text, value, variant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${CLASS.button} ${variant}`;
  button.dataset.mtDismiss = "modal";
  button.textContent = text;
  buttonMeta.set(button, { text, value });
  return button;
}
var _Modal = class _Modal extends Emitter {
  constructor(options = {}) {
    super();
    this.el = null;
    this._scrollbarWidth = 0;
    this._bodyOverflowing = false;
    this._originalBodyPadding = "";
    this._pointerInContent = false;
    this._active = false;
    this._visible = false;
    this._events = null;
    this._drag = null;
    this._dragMove = null;
    this._dragUp = null;
    this._timers = {};
    this.id = `mtmodal-${(++uid).toString(36)}`;
    this._options = { ...DEFAULTS, ...options };
    this._strings = resolveStrings(this._options.strings);
    this._scrollbarWidth = calcScrollbarWidth();
    const appendTo = resolveElement(this._options.appendTo);
    if (!appendTo) {
      throw new Error(
        `tiny-modal-dialog: appendTo element "${String(this._options.appendTo)}" not found.`
      );
    }
    this._appendTo = appendTo;
    if (this._options.el) {
      const el = resolveElement(this._options.el);
      if (!el) {
        throw new Error(
          `tiny-modal-dialog: element "${String(this._options.el)}" not found.`
        );
      }
      this.el = el;
      instances.set(el, this);
      this._construct = false;
    } else {
      this._construct = true;
    }
    this._html = this._construct ? this._render() : this._mapDom();
    this._applyTheme(this._html.container);
  }
  static getInstance(el) {
    return instances.get(el) ?? null;
  }
  static get strings() {
    return { ...globalStrings };
  }
  static set strings(value) {
    globalStrings = { ...globalStrings, ...value };
  }
  static resetStrings() {
    globalStrings = { ...DEFAULT_STRINGS };
  }
  static alert(message, options = {}) {
    const strings = resolveStrings(options.strings);
    return new _Modal({
      title: message,
      content: false,
      headerClose: false,
      footer: createButton(strings.ok, true, CLASS.buttonPrimary),
      ...options
    });
  }
  static confirm(question, options = {}) {
    return new _Modal({
      title: question,
      content: false,
      headerClose: false,
      footer: true,
      ...options
    });
  }
  get visible() {
    return this._visible;
  }
  show() {
    if (this._active) return this;
    this._active = true;
    const html = this._html;
    const container = html.container;
    this.emit("show", this);
    if (!this._isMovable()) {
      this._checkScrollbar();
      this._setScrollbar();
      document.body.classList.add(CLASS.open);
    }
    if (this._construct) this._appendTo.appendChild(container);
    container.style.display = "block";
    container.scrollTop = 0;
    if (this._isMovable()) {
      container.classList.add(CLASS.movable);
      this._resetDialogPosition();
    }
    const start = () => {
      if (!this._active) return;
      this._setEvents();
      if (this._options.animate) void container.offsetWidth;
      container.classList.add(CLASS.show);
      this._resize();
      this._timers.shown = window.setTimeout(() => {
        this._visible = true;
        this.emit("shown", this);
      }, TRANSITION);
    };
    if (this._effectiveBackdrop() !== false) {
      this.once("showBackdrop", start);
      this._backdrop();
    } else {
      start();
    }
    return this;
  }
  hide() {
    if (!this._active) return this;
    this._active = false;
    const html = this._html;
    const container = html.container;
    this.emit("hide", this);
    window.clearTimeout(this._timers.shown);
    this._timers.shown = void 0;
    container.classList.remove(CLASS.show);
    if (html.backdrop) html.backdrop.classList.remove(CLASS.show);
    this._removeEvents();
    window.clearTimeout(this._timers.scrollbar);
    this._timers.scrollbar = window.setTimeout(() => {
      if (this._isMovable()) return;
      document.body.classList.remove(CLASS.open);
      document.body.style.paddingRight = this._originalBodyPadding;
    }, BACKDROP_TRANSITION);
    window.clearTimeout(this._timers.hidden);
    this._timers.hidden = window.setTimeout(() => {
      if (html.backdrop?.parentNode)
        html.backdrop.parentNode.removeChild(html.backdrop);
      html.backdrop = null;
      container.classList.remove(CLASS.show, CLASS.movable, CLASS.dragging);
      container.style.display = "none";
      if (this._construct && container.parentNode)
        container.parentNode.removeChild(container);
      this._visible = false;
      this.emit("hidden", this);
    }, TRANSITION);
    return this;
  }
  toggle() {
    return this._active ? this.hide() : this.show();
  }
  setContent(content) {
    this._options.content = content;
    const body = this._html.body;
    if (content === false) {
      body.replaceChildren();
    } else {
      this._applyContent(body, content);
    }
    if (this._construct && body.parentNode !== this._html.content) {
      this._html.content.appendChild(body);
    }
    return this;
  }
  getContent() {
    return this._options.content;
  }
  _render() {
    const headerClose = build(TEMPLATES.headerClose);
    headerClose.setAttribute("aria-label", this._strings.close);
    const html = {
      container: build(TEMPLATES.container),
      dialog: build(TEMPLATES.dialog),
      content: build(TEMPLATES.content),
      header: build(TEMPLATES.header),
      headerClose,
      body: build(TEMPLATES.body),
      footer: build(TEMPLATES.footer),
      backdrop: null
    };
    if (this._options.animate) html.container.classList.add(CLASS.fade);
    this.el = html.container;
    html.dialog.appendChild(html.content);
    html.container.appendChild(html.dialog);
    this._mapHtml(html);
    this._setHeader();
    this._setContent();
    this._setFooter();
    return html;
  }
  _mapDom() {
    const el = this.el;
    const html = {
      container: el,
      dialog: el.querySelector(`.${CLASS.dialog}`) ?? el,
      content: el.querySelector(`.${CLASS.content}`) ?? el,
      header: el.querySelector(`.${CLASS.header}`),
      headerClose: el.querySelector(`.${CLASS.close}`),
      body: el.querySelector(`.${CLASS.body}`) ?? el,
      footer: el.querySelector(`.${CLASS.footer}`),
      backdrop: null
    };
    if (el.classList.contains(CLASS.fade)) this._options.animate = true;
    this._mapHtml(html);
    this._setHeader();
    this._setContent();
    this._setFooter();
    return html;
  }
  _mapHtml(html) {
    this._html = html;
  }
  _setHeader() {
    const html = this._html;
    const { header, title, headerClose } = this._options;
    if (!header || !html.header) return;
    if (typeof title === "string") {
      const titleEl = build(`<h4 class="${CLASS.title}"></h4>`);
      titleEl.textContent = title;
      html.header.replaceChildren(titleEl);
    } else if (title instanceof Node) {
      html.header.replaceChildren(title);
    }
    if (this._construct && headerClose && html.headerClose) {
      html.header.appendChild(html.headerClose);
    }
    if (this._construct) html.content.appendChild(html.header);
  }
  _setContent() {
    if (this._options.content !== false) {
      this._applyContent(this._html.body, this._options.content);
    }
    if (this._construct) this._html.content.appendChild(this._html.body);
  }
  _setFooter() {
    const html = this._html;
    const { footer } = this._options;
    if (!footer || !html.footer) return;
    if (typeof footer === "string") {
      html.footer.innerHTML = footer;
    } else if (footer instanceof Node) {
      html.footer.replaceChildren(footer);
    } else if (!html.footer.children.length) {
      html.footer.appendChild(
        createButton(this._strings.cancel, false, CLASS.buttonDefault)
      );
      html.footer.appendChild(
        createButton(this._strings.ok, true, CLASS.buttonPrimary)
      );
    }
    if (this._construct) html.content.appendChild(html.footer);
  }
  _applyContent(container, content) {
    if (typeof content === "string") {
      container.innerHTML = content;
    } else {
      container.replaceChildren(content);
    }
  }
  _setEvents() {
    if (this._events) return;
    const container = this._html.container;
    const events = {
      keydown: (event) => this._handleKeydown(event),
      mousedown: (event) => this._handleMousedown(event),
      click: (event) => this._handleClick(event),
      resize: () => this._handleResize(),
      pointerdown: (event) => this._handlePointerDown(event)
    };
    document.body.addEventListener("keydown", events.keydown);
    container.addEventListener("mousedown", events.mousedown);
    container.addEventListener("click", events.click);
    window.addEventListener("resize", events.resize);
    if (this._isMovable() && this._html.header) {
      this._html.header.addEventListener("pointerdown", events.pointerdown);
    }
    this._events = events;
  }
  _removeEvents() {
    const events = this._events;
    if (!events) return;
    document.body.removeEventListener("keydown", events.keydown);
    this._html.container.removeEventListener("mousedown", events.mousedown);
    this._html.container.removeEventListener("click", events.click);
    window.removeEventListener("resize", events.resize);
    if (this._html.header)
      this._html.header.removeEventListener("pointerdown", events.pointerdown);
    this._removeDragEvents();
    this._events = null;
  }
  _handleMousedown(event) {
    const target = event.target;
    this._pointerInContent = Boolean(target?.closest(`.${CLASS.content}`));
  }
  _handleClick(event) {
    const target = event.target;
    if (!target) return;
    const dismissEl = target.closest('[data-mt-dismiss="modal"]');
    if (dismissEl) {
      this.emit("dismiss", this, event, buttonMeta.get(dismissEl) ?? null);
      this.hide();
      return;
    }
    if (this._effectiveBackdrop() === true && !this._pointerInContent && target.closest(`.${CLASS.container}`)) {
      this.emit("dismiss", this, event, null);
      this.hide();
    }
    this._pointerInContent = false;
  }
  _handleKeydown(event) {
    if (!this._options.keyboard) return;
    if (event.key === "Escape") {
      this.emit("dismiss", this, event, null);
      this.hide();
      return;
    }
    if (event.key !== "Enter" || event.repeat || event.isComposing) return;
    const active = document.activeElement;
    if (active) {
      const editableAttr = active.getAttribute("contenteditable");
      const isEditable = active.isContentEditable || editableAttr !== null && editableAttr !== "false";
      if (active.tagName === "TEXTAREA" || isEditable) return;
      if (active.tagName === "BUTTON" || active.tagName === "A") return;
    }
    this.emit("submit", this, event);
    const form = this._findForm(event);
    if (!form) return;
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.submit();
  }
  _findForm(event) {
    const target = event.target;
    const fromTarget = target?.closest("form");
    if (fromTarget) return fromTarget;
    const form = this._html.body.querySelector("form");
    return form instanceof HTMLFormElement ? form : null;
  }
  _handleResize() {
    this._resize();
    this._clampPosition();
  }
  _checkScrollbar() {
    this._bodyOverflowing = document.body.clientWidth < window.innerWidth;
  }
  _setScrollbar() {
    this._originalBodyPadding = document.body.style.paddingRight || "";
    if (this._bodyOverflowing) {
      const base = parseInt(this._originalBodyPadding || "0", 10) || 0;
      document.body.style.paddingRight = `${base + this._scrollbarWidth}px`;
    }
  }
  _resize() {
    const container = this._html.container;
    const modalOverflowing = container.scrollHeight > document.documentElement.clientHeight;
    container.style.paddingLeft = !this._bodyOverflowing && modalOverflowing ? `${this._scrollbarWidth}px` : "";
    container.style.paddingRight = this._bodyOverflowing && !modalOverflowing ? `${this._scrollbarWidth}px` : "";
  }
  _backdrop() {
    const backdrop = build(TEMPLATES.backdrop);
    this._html.backdrop = backdrop;
    if (this._options.animate) backdrop.classList.add(CLASS.fade);
    this._applyTheme(backdrop);
    this._appendTo.appendChild(backdrop);
    if (this._options.animate) void backdrop.offsetWidth;
    backdrop.classList.add(CLASS.show);
    window.setTimeout(
      () => this.emit("showBackdrop", this),
      BACKDROP_TRANSITION
    );
  }
  _isMovable() {
    return this._options.movable;
  }
  _applyTheme(el) {
    const theme = this._options.theme;
    if (theme === "dark") el.classList.add(CLASS.themeDark);
    else if (theme === "auto") el.classList.add(CLASS.themeAuto);
  }
  _effectiveBackdrop() {
    return this._isMovable() ? false : this._options.backdrop;
  }
  _handlePointerDown(event) {
    if (!this._isMovable() || event.button !== 0) return;
    const target = event.target;
    if (target?.closest("button, a, input, select, textarea")) return;
    const header = this._html.header;
    const dialog = this._html.dialog;
    const container = this._html.container;
    if (!header || !dialog) return;
    const dialogRect = dialog.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    dialog.style.position = "absolute";
    dialog.style.margin = "0";
    dialog.style.transform = "none";
    this._drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: dialogRect.left - containerRect.left,
      startTop: dialogRect.top - containerRect.top
    };
    dialog.style.left = `${this._drag.startLeft}px`;
    dialog.style.top = `${this._drag.startTop}px`;
    container.classList.add(CLASS.dragging);
    try {
      header.setPointerCapture(event.pointerId);
    } catch {
    }
    this._dragMove = (moveEvent) => this._handlePointerMove(moveEvent);
    this._dragUp = (upEvent) => this._handlePointerUp(upEvent);
    header.addEventListener("pointermove", this._dragMove);
    header.addEventListener("pointerup", this._dragUp);
    header.addEventListener("pointercancel", this._dragUp);
    event.preventDefault();
  }
  _handlePointerMove(event) {
    if (!this._drag) return;
    const left = this._drag.startLeft + (event.clientX - this._drag.startX);
    const top = this._drag.startTop + (event.clientY - this._drag.startY);
    this._setDialogPosition(left, top);
  }
  _handlePointerUp(event) {
    const drag = this._drag;
    if (!drag) return;
    const header = this._html.header;
    try {
      header?.releasePointerCapture(drag.pointerId);
    } catch {
    }
    this._removeDragEvents();
    this._drag = null;
    this._html.container.classList.remove(CLASS.dragging);
    void event;
  }
  _setDialogPosition(left, top) {
    const dialog = this._html.dialog;
    const maxLeft = Math.max(window.innerWidth - dialog.offsetWidth, 0);
    const maxTop = Math.max(window.innerHeight - dialog.offsetHeight, 0);
    dialog.style.left = `${Math.min(Math.max(left, 0), maxLeft)}px`;
    dialog.style.top = `${Math.min(Math.max(top, 0), maxTop)}px`;
  }
  _resetDialogPosition() {
    const dialog = this._html.dialog;
    dialog.style.position = "";
    dialog.style.left = "";
    dialog.style.top = "";
    dialog.style.margin = "";
    dialog.style.transform = "";
  }
  _removeDragEvents() {
    const header = this._html.header;
    if (!header) return;
    if (this._dragMove) {
      header.removeEventListener(
        "pointermove",
        this._dragMove
      );
    }
    if (this._dragUp) {
      header.removeEventListener("pointerup", this._dragUp);
      header.removeEventListener(
        "pointercancel",
        this._dragUp
      );
    }
    this._dragMove = null;
    this._dragUp = null;
  }
  _clampPosition() {
    if (!this._isMovable()) return;
    const dialog = this._html.dialog;
    if (!dialog.style.left && !dialog.style.top) return;
    this._setDialogPosition(
      parseFloat(dialog.style.left) || 0,
      parseFloat(dialog.style.top) || 0
    );
  }
};
_Modal.version = "0.1.0";
var Modal = _Modal;
export {
  Emitter,
  Modal
};
//# sourceMappingURL=index.js.map