import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../src/index';

function pointer(
  type: string,
  init: { clientX?: number; clientY?: number; button?: number; pointerId?: number } = {}
): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    button: init.button ?? 0
  });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  return event as unknown as PointerEvent;
}

beforeEach(() => {
  document.body.className = '';
  document.body.innerHTML = '';
  document.body.style.paddingRight = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Modal movable', () => {
  it('forces the backdrop off and adds the movable class', () => {
    const modal = new Modal({ content: 'x', movable: true });
    modal.show();
    vi.advanceTimersByTime(300);
    expect(document.querySelector('.mtmodal-backdrop')).toBeNull();
    expect((modal.el as HTMLElement).classList.contains('mtmodal-movable')).toBe(true);
  });

  it('does not dismiss on outside click even when backdrop is true', () => {
    const modal = new Modal({ content: 'x', backdrop: true, movable: true });
    modal.show();
    vi.advanceTimersByTime(300);
    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    (modal.el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('moves the dialog with pointer drag on the header', () => {
    const modal = new Modal({ content: 'x', movable: true });
    modal.show();
    vi.advanceTimersByTime(300);

    const header = (modal.el as HTMLElement).querySelector('.mtmodal-header') as HTMLElement;
    const dialog = (modal.el as HTMLElement).querySelector('.mtmodal-dialog') as HTMLElement;

    header.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    expect((modal.el as HTMLElement).classList.contains('mtmodal-dragging')).toBe(true);

    header.dispatchEvent(pointer('pointermove', { clientX: 160, clientY: 130 }));
    expect(dialog.style.left).toBe('60px');
    expect(dialog.style.top).toBe('30px');

    header.dispatchEvent(pointer('pointerup', { clientX: 160, clientY: 130 }));
    expect((modal.el as HTMLElement).classList.contains('mtmodal-dragging')).toBe(false);
  });

  it('does not start a drag from an interactive element in the header', () => {
    const modal = new Modal({ content: 'x', movable: true, headerClose: true });
    modal.show();
    vi.advanceTimersByTime(300);

    const close = (modal.el as HTMLElement).querySelector('.mtmodal-close') as HTMLElement;
    close.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }));
    expect((modal.el as HTMLElement).classList.contains('mtmodal-dragging')).toBe(false);
  });

  it('clamps the dialog to the viewport', () => {
    const modal = new Modal({ content: 'x', movable: true });
    modal.show();
    vi.advanceTimersByTime(300);

    const header = (modal.el as HTMLElement).querySelector('.mtmodal-header') as HTMLElement;
    const dialog = (modal.el as HTMLElement).querySelector('.mtmodal-dialog') as HTMLElement;

    header.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    header.dispatchEvent(pointer('pointermove', { clientX: -500, clientY: -500 }));
    expect(dialog.style.left).toBe('0px');
    expect(dialog.style.top).toBe('0px');
  });

  it('does not drag when movable is false', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);
    const header = (modal.el as HTMLElement).querySelector('.mtmodal-header') as HTMLElement;
    header.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }));
    expect((modal.el as HTMLElement).classList.contains('mtmodal-dragging')).toBe(false);
  });

  it('does not lock the body scroll', () => {
    const modal = new Modal({ content: 'x', movable: true });
    modal.show();
    vi.advanceTimersByTime(300);
    expect(document.body.classList.contains('mtmodal-open')).toBe(false);
    expect(document.body.style.paddingRight).toBe('');
  });

  it('does not restore the body padding on hide', () => {
    document.body.style.paddingRight = '12px';
    const modal = new Modal({ content: 'x', movable: true });
    modal.show();
    vi.advanceTimersByTime(300);
    modal.hide();
    vi.advanceTimersByTime(300);
    expect(document.body.style.paddingRight).toBe('12px');
    expect(document.body.classList.contains('mtmodal-open')).toBe(false);
  });
});
