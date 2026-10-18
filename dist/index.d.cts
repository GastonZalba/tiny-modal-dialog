type EventListener = (...args: any[]) => void;
declare class Emitter<Events extends Record<string, unknown[]> = Record<string, unknown[]>> {
    private _listeners;
    on<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => void): this;
    on(event: string, listener: EventListener): this;
    once<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => void): this;
    once(event: string, listener: EventListener): this;
    off<K extends keyof Events & string>(event: K, listener?: (...args: Events[K]) => void): this;
    off(event: string, listener?: EventListener): this;
    removeListener<K extends keyof Events & string>(event: K, listener?: (...args: Events[K]) => void): this;
    removeListener(event: string, listener?: EventListener): this;
    removeAllListeners<K extends keyof Events & string>(event?: K): this;
    removeAllListeners(event?: string): this;
    emit<K extends keyof Events & string>(event: K, ...args: Events[K]): boolean;
    emit(event: string, ...args: unknown[]): boolean;
    listenerCount(event: string): number;
}

type ModalContent = string | Node | false;
type ModalTheme = "light" | "dark" | "auto";
interface ModalStrings {
    ok: string;
    cancel: string;
    close: string;
}
interface ModalOptions {
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
interface ModalButton {
    text: string;
    value: boolean;
}
interface ModalEvents extends Record<string, unknown[]> {
    show: [modal: Modal, event?: Event];
    shown: [modal: Modal, event?: Event];
    hide: [modal: Modal, event?: Event];
    hidden: [modal: Modal, event?: Event];
    dismiss: [modal: Modal, event?: Event, button?: ModalButton | null];
    submit: [modal: Modal, event: Event];
    showBackdrop: [modal: Modal, event?: Event];
}
declare class Modal extends Emitter<ModalEvents> {
    static readonly version = "0.1.0";
    readonly id: string;
    el: HTMLElement | null;
    private _options;
    private _html;
    private _strings;
    private _appendTo;
    private _construct;
    private _scrollbarWidth;
    private _bodyOverflowing;
    private _originalBodyPadding;
    private _pointerInContent;
    private _active;
    private _visible;
    private _events;
    private _drag;
    private _dragMove;
    private _dragUp;
    private _timers;
    constructor(options?: ModalOptions);
    static getInstance(el: HTMLElement): Modal | null;
    static get strings(): ModalStrings;
    static set strings(value: Partial<ModalStrings>);
    static resetStrings(): void;
    static alert(message: string, options?: ModalOptions): Modal;
    static confirm(question: string, options?: ModalOptions): Modal;
    get visible(): boolean;
    show(): this;
    hide(): this;
    toggle(): this;
    setContent(content: ModalContent): this;
    private _render;
    private _mapDom;
    private _mapHtml;
    private _setHeader;
    private _setContent;
    private _setFooter;
    private _applyContent;
    private _setEvents;
    private _removeEvents;
    private _handleMousedown;
    private _handleClick;
    private _handleKeydown;
    private _findForm;
    private _handleResize;
    private _checkScrollbar;
    private _setScrollbar;
    private _resize;
    private _backdrop;
    private _isMovable;
    private _applyTheme;
    private _effectiveBackdrop;
    private _handlePointerDown;
    private _handlePointerMove;
    private _handlePointerUp;
    private _setDialogPosition;
    private _resetDialogPosition;
    private _removeDragEvents;
    private _clampPosition;
}

export { Emitter, type EventListener, Modal, type ModalButton, type ModalContent, type ModalEvents, type ModalOptions, type ModalStrings, type ModalTheme };
