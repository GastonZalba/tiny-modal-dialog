import { build, calcScrollbarWidth, resolveElement } from "./dom";
import { Emitter } from "./emitter";

const TRANSITION = 300;
const BACKDROP_TRANSITION = 150;

const CLASS = {
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
  themeAuto: "mtmodal-auto",
} as const;

const TEMPLATES = {
  container: `<div class="${CLASS.container}"></div>`,
  dialog: `<div class="${CLASS.dialog}"></div>`,
  content: `<div class="${CLASS.content}"></div>`,
  header: `<div class="${CLASS.header}"></div>`,
  headerClose: `<button type="button" class="${CLASS.close}" data-mt-dismiss="modal"><span aria-hidden="true">&times;</span></button>`,
  body: `<div class="${CLASS.body}"></div>`,
  footer: `<div class="${CLASS.footer}"></div>`,
  backdrop: `<div class="${CLASS.backdrop}"></div>`,
} as const;

export type ModalContent = string | Node | false;
export type ModalTheme = "light" | "dark" | "auto";

export interface ModalStrings {
  ok: string;
  cancel: string;
  close: string;
}

export interface ModalOptions {
  el?: HTMLElement | string | null;
  animate?: boolean;
  backdrop?: boolean | "static";
  keyboard?: boolean;
  title?: string | Node | false;
  header?: boolean;
  content?: ModalContent;
  footer?: boolean | string | Node;
  headerClose?: boolean;
  appendTo?: string | HTMLElement;
  movable?: boolean;
  theme?: ModalTheme;
  strings?: Partial<ModalStrings>;
}

export interface ModalButton {
  text: string;
  value: boolean;
}

export interface ModalEvents extends Record<string, unknown[]> {
  show: [modal: Modal, event?: Event];
  shown: [modal: Modal, event?: Event];
  hide: [modal: Modal, event?: Event];
  hidden: [modal: Modal, event?: Event];
  dismiss: [modal: Modal, event?: Event, button?: ModalButton | null];
  submit: [modal: Modal, event: Event];
  showBackdrop: [modal: Modal, event?: Event];
}

type ResolvedOptions = Required<ModalOptions>;

interface ModalElements {
  container: HTMLElement;
  dialog: HTMLElement;
  content: HTMLElement;
  header: HTMLElement | null;
  headerClose: HTMLElement | null;
  body: HTMLElement;
  footer: HTMLElement | null;
  backdrop: HTMLElement | null;
}

const DEFAULT_STRINGS: ModalStrings = {
  ok: "OK",
  cancel: "Cancel",
  close: "Close",
};

const DEFAULTS: ResolvedOptions = {
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
  strings: {},
};

let globalStrings: ModalStrings = { ...DEFAULT_STRINGS };

const buttonMeta = new WeakMap<HTMLElement, ModalButton>();
const instances = new WeakMap<HTMLElement, Modal>();

let uid = 0;

function resolveStrings(override?: Partial<ModalStrings>): ModalStrings {
  return { ...globalStrings, ...override };
}

function createButton(
  text: string,
  value: boolean,
  variant: string,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${CLASS.button} ${variant}`;
  button.dataset.mtDismiss = "modal";
  button.textContent = text;
  buttonMeta.set(button, { text, value });
  return button;
}

export class Modal extends Emitter<ModalEvents> {
  static readonly version = "0.1.0";

  readonly id: string;
  el: HTMLElement | null = null;

  private _options: ResolvedOptions;
  private _html: ModalElements;
  private _strings: ModalStrings;
  private _appendTo: HTMLElement;
  private _construct: boolean;
  private _scrollbarWidth = 0;
  private _bodyOverflowing = false;
  private _originalBodyPadding = "";
  private _pointerInContent = false;
  private _active = false;
  private _visible = false;
  private _events: {
    keydown: (event: Event) => void;
    mousedown: (event: Event) => void;
    click: (event: Event) => void;
    resize: (event: Event) => void;
    pointerdown: (event: Event) => void;
  } | null = null;
  private _drag: {
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null = null;
  private _dragMove: ((event: PointerEvent) => void) | null = null;
  private _dragUp: ((event: PointerEvent) => void) | null = null;
  private _timers: { shown?: number; scrollbar?: number; hidden?: number } = {};

  constructor(options: ModalOptions = {}) {
    super();
    this.id = `mtmodal-${(++uid).toString(36)}`;
    this._options = { ...DEFAULTS, ...options };
    this._strings = resolveStrings(this._options.strings);
    this._scrollbarWidth = calcScrollbarWidth();

    const appendTo = resolveElement(this._options.appendTo);
    if (!appendTo) {
      throw new Error(
        `modal-ts: appendTo element "${String(this._options.appendTo)}" not found.`,
      );
    }
    this._appendTo = appendTo;

    if (this._options.el) {
      const el = resolveElement(this._options.el);
      if (!el) {
        throw new Error(
          `modal-ts: element "${String(this._options.el)}" not found.`,
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

  static getInstance(el: HTMLElement): Modal | null {
    return instances.get(el) ?? null;
  }

  static get strings(): ModalStrings {
    return { ...globalStrings };
  }

  static set strings(value: Partial<ModalStrings>) {
    globalStrings = { ...globalStrings, ...value };
  }

  static resetStrings(): void {
    globalStrings = { ...DEFAULT_STRINGS };
  }

  static alert(message: string, options: ModalOptions = {}): Modal {
    const strings = resolveStrings(options.strings);
    return new Modal({
      title: message,
      content: false,
      headerClose: false,
      footer: createButton(strings.ok, true, CLASS.buttonPrimary),
      ...options,
    });
  }

  static confirm(question: string, options: ModalOptions = {}): Modal {
    return new Modal({
      title: question,
      content: false,
      headerClose: false,
      footer: true,
      ...options,
    });
  }

  get visible(): boolean {
    return this._visible;
  }

  show(): this {
    if (this._active) return this;
    this._active = true;

    const html = this._html;
    const container = html.container;
    this.emit("show", this);

    this._checkScrollbar();
    this._setScrollbar();
    document.body.classList.add(CLASS.open);

    if (this._construct) this._appendTo.appendChild(container);

    container.style.display = "block";
    container.scrollTop = 0;
    if (this._isMovable()) {
      container.classList.add(CLASS.movable);
      this._resetDialogPosition();
    }

    const start = (): void => {
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

  hide(): this {
    if (!this._active) return this;
    this._active = false;

    const html = this._html;
    const container = html.container;
    this.emit("hide", this);

    window.clearTimeout(this._timers.shown);
    this._timers.shown = undefined;

    container.classList.remove(CLASS.show);
    if (html.backdrop) html.backdrop.classList.remove(CLASS.show);

    this._removeEvents();

    window.clearTimeout(this._timers.scrollbar);
    this._timers.scrollbar = window.setTimeout(() => {
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

  toggle(): this {
    return this._active ? this.hide() : this.show();
  }

  setContent(content: ModalContent): this {
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

  private _render(): ModalElements {
    const headerClose = build<HTMLButtonElement>(TEMPLATES.headerClose);
    headerClose.setAttribute("aria-label", this._strings.close);

    const html: ModalElements = {
      container: build(TEMPLATES.container),
      dialog: build(TEMPLATES.dialog),
      content: build(TEMPLATES.content),
      header: build(TEMPLATES.header),
      headerClose,
      body: build(TEMPLATES.body),
      footer: build(TEMPLATES.footer),
      backdrop: null,
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

  private _mapDom(): ModalElements {
    const el = this.el as HTMLElement;
    const html: ModalElements = {
      container: el,
      dialog: el.querySelector(`.${CLASS.dialog}`) ?? el,
      content: el.querySelector(`.${CLASS.content}`) ?? el,
      header: el.querySelector(`.${CLASS.header}`),
      headerClose: el.querySelector(`.${CLASS.close}`),
      body: el.querySelector(`.${CLASS.body}`) ?? el,
      footer: el.querySelector(`.${CLASS.footer}`),
      backdrop: null,
    };

    if (el.classList.contains(CLASS.fade)) this._options.animate = true;

    this._mapHtml(html);
    this._setHeader();
    this._setContent();
    this._setFooter();

    return html;
  }

  private _mapHtml(html: ModalElements): void {
    this._html = html;
  }

  private _setHeader(): void {
    const html = this._html;
    const { header, title, headerClose } = this._options;
    if (!header || !html.header) return;

    if (typeof title === "string") {
      const titleEl = build<HTMLElement>(`<h4 class="${CLASS.title}"></h4>`);
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

  private _setContent(): void {
    if (this._options.content !== false) {
      this._applyContent(this._html.body, this._options.content);
    }
    if (this._construct) this._html.content.appendChild(this._html.body);
  }

  private _setFooter(): void {
    const html = this._html;
    const { footer } = this._options;
    if (!footer || !html.footer) return;

    if (typeof footer === "string") {
      html.footer.innerHTML = footer;
    } else if (footer instanceof Node) {
      html.footer.replaceChildren(footer);
    } else if (!html.footer.children.length) {
      html.footer.appendChild(
        createButton(this._strings.cancel, false, CLASS.buttonDefault),
      );
      html.footer.appendChild(
        createButton(this._strings.ok, true, CLASS.buttonPrimary),
      );
    }

    if (this._construct) html.content.appendChild(html.footer);
  }

  private _applyContent(container: HTMLElement, content: string | Node): void {
    if (typeof content === "string") {
      container.innerHTML = content;
    } else {
      container.replaceChildren(content);
    }
  }

  private _setEvents(): void {
    if (this._events) return;

    const container = this._html.container;
    const events = {
      keydown: (event: Event) => this._handleKeydown(event as KeyboardEvent),
      mousedown: (event: Event) => this._handleMousedown(event as MouseEvent),
      click: (event: Event) => this._handleClick(event as MouseEvent),
      resize: () => this._handleResize(),
      pointerdown: (event: Event) =>
        this._handlePointerDown(event as PointerEvent),
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

  private _removeEvents(): void {
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

  private _handleMousedown(event: MouseEvent): void {
    const target = event.target as Element | null;
    this._pointerInContent = Boolean(target?.closest(`.${CLASS.content}`));
  }

  private _handleClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (!target) return;

    const dismissEl = target.closest<HTMLElement>('[data-mt-dismiss="modal"]');
    if (dismissEl) {
      this.emit("dismiss", this, event, buttonMeta.get(dismissEl) ?? null);
      this.hide();
      return;
    }

    if (
      this._effectiveBackdrop() === true &&
      !this._pointerInContent &&
      target.closest(`.${CLASS.container}`)
    ) {
      this.emit("dismiss", this, event, null);
      this.hide();
    }

    this._pointerInContent = false;
  }

  private _handleKeydown(event: KeyboardEvent): void {
    if (!this._options.keyboard) return;

    if (event.key === "Escape") {
      this.emit("dismiss", this, event, null);
      this.hide();
      return;
    }

    if (event.key !== "Enter" || event.repeat || event.isComposing) return;

    const active = document.activeElement as HTMLElement | null;
    if (active) {
      const editableAttr = active.getAttribute("contenteditable");
      const isEditable =
        active.isContentEditable ||
        (editableAttr !== null && editableAttr !== "false");
      if (active.tagName === "TEXTAREA" || isEditable) return;
      if (active.tagName === "BUTTON" || active.tagName === "A") return;
    }

    this.emit("submit", this, event);
    const form = this._findForm(event);
    if (!form) return;
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.submit();
  }

  private _findForm(event: Event): HTMLFormElement | null {
    const target = event.target as Element | null;
    const fromTarget = target?.closest("form");
    if (fromTarget) return fromTarget as HTMLFormElement;
    const form = this._html.body.querySelector("form");
    return form instanceof HTMLFormElement ? form : null;
  }

  private _handleResize(): void {
    this._resize();
    this._clampPosition();
  }

  private _checkScrollbar(): void {
    this._bodyOverflowing = document.body.clientWidth < window.innerWidth;
  }

  private _setScrollbar(): void {
    this._originalBodyPadding = document.body.style.paddingRight || "";
    if (this._bodyOverflowing) {
      const base = parseInt(this._originalBodyPadding || "0", 10) || 0;
      document.body.style.paddingRight = `${base + this._scrollbarWidth}px`;
    }
  }

  private _resize(): void {
    const container = this._html.container;
    const modalOverflowing =
      container.scrollHeight > document.documentElement.clientHeight;
    container.style.paddingLeft =
      !this._bodyOverflowing && modalOverflowing
        ? `${this._scrollbarWidth}px`
        : "";
    container.style.paddingRight =
      this._bodyOverflowing && !modalOverflowing
        ? `${this._scrollbarWidth}px`
        : "";
  }

  private _backdrop(): void {
    const backdrop = build<HTMLElement>(TEMPLATES.backdrop);
    this._html.backdrop = backdrop;
    if (this._options.animate) backdrop.classList.add(CLASS.fade);
    this._applyTheme(backdrop);
    this._appendTo.appendChild(backdrop);
    if (this._options.animate) void backdrop.offsetWidth;
    backdrop.classList.add(CLASS.show);
    window.setTimeout(
      () => this.emit("showBackdrop", this),
      BACKDROP_TRANSITION,
    );
  }

  private _isMovable(): boolean {
    return this._options.movable;
  }

  private _applyTheme(el: HTMLElement): void {
    const theme = this._options.theme;
    if (theme === "dark") el.classList.add(CLASS.themeDark);
    else if (theme === "auto") el.classList.add(CLASS.themeAuto);
  }

  private _effectiveBackdrop(): boolean | "static" {
    return this._isMovable() ? false : this._options.backdrop;
  }

  private _handlePointerDown(event: PointerEvent): void {
    if (!this._isMovable() || event.button !== 0) return;
    const target = event.target as Element | null;
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
      startTop: dialogRect.top - containerRect.top,
    };
    dialog.style.left = `${this._drag.startLeft}px`;
    dialog.style.top = `${this._drag.startTop}px`;

    container.classList.add(CLASS.dragging);
    try {
      header.setPointerCapture(event.pointerId);
    } catch {
      /* setPointerCapture unsupported */
    }

    this._dragMove = (moveEvent) => this._handlePointerMove(moveEvent);
    this._dragUp = (upEvent) => this._handlePointerUp(upEvent);
    header.addEventListener("pointermove", this._dragMove as EventListener);
    header.addEventListener("pointerup", this._dragUp as EventListener);
    header.addEventListener("pointercancel", this._dragUp as EventListener);
    event.preventDefault();
  }

  private _handlePointerMove(event: PointerEvent): void {
    if (!this._drag) return;
    const left = this._drag.startLeft + (event.clientX - this._drag.startX);
    const top = this._drag.startTop + (event.clientY - this._drag.startY);
    this._setDialogPosition(left, top);
  }

  private _handlePointerUp(event: PointerEvent): void {
    const drag = this._drag;
    if (!drag) return;
    const header = this._html.header;
    try {
      header?.releasePointerCapture(drag.pointerId);
    } catch {
      /* releasePointerCapture unsupported */
    }
    this._removeDragEvents();
    this._drag = null;
    this._html.container.classList.remove(CLASS.dragging);
    void event;
  }

  private _setDialogPosition(left: number, top: number): void {
    const dialog = this._html.dialog;
    const maxLeft = Math.max(window.innerWidth - dialog.offsetWidth, 0);
    const maxTop = Math.max(window.innerHeight - dialog.offsetHeight, 0);
    dialog.style.left = `${Math.min(Math.max(left, 0), maxLeft)}px`;
    dialog.style.top = `${Math.min(Math.max(top, 0), maxTop)}px`;
  }

  private _resetDialogPosition(): void {
    const dialog = this._html.dialog;
    dialog.style.position = "";
    dialog.style.left = "";
    dialog.style.top = "";
    dialog.style.margin = "";
    dialog.style.transform = "";
  }

  private _removeDragEvents(): void {
    const header = this._html.header;
    if (!header) return;
    if (this._dragMove) {
      header.removeEventListener(
        "pointermove",
        this._dragMove as EventListener,
      );
    }
    if (this._dragUp) {
      header.removeEventListener("pointerup", this._dragUp as EventListener);
      header.removeEventListener(
        "pointercancel",
        this._dragUp as EventListener,
      );
    }
    this._dragMove = null;
    this._dragUp = null;
  }

  private _clampPosition(): void {
    if (!this._isMovable()) return;
    const dialog = this._html.dialog;
    if (!dialog.style.left && !dialog.style.top) return;
    this._setDialogPosition(
      parseFloat(dialog.style.left) || 0,
      parseFloat(dialog.style.top) || 0,
    );
  }
}
