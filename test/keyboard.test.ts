import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../src/index';

function key(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
}

beforeEach(() => {
  document.body.className = '';
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Modal keyboard', () => {
  it('dismisses and hides on Escape', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    document.body.dispatchEvent(key('Escape'));

    expect(dismiss).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(300);
    expect(modal.visible).toBe(false);
  });

  it('ignores Escape when keyboard is false', () => {
    const modal = new Modal({ content: 'x', keyboard: false, backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    document.body.dispatchEvent(key('Escape'));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('emits submit and submits a form on Enter', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    form.appendChild(input);
    const nativeSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', nativeSubmit);

    const modal = new Modal({ content: form, backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const submit = vi.fn();
    modal.on('submit', submit);
    input.focus();
    input.dispatchEvent(key('Enter'));

    expect(submit).toHaveBeenCalledTimes(1);
    expect(nativeSubmit).toHaveBeenCalledTimes(1);
  });

  it('emits submit even without a form', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const submit = vi.fn();
    modal.on('submit', submit);
    document.body.dispatchEvent(key('Enter'));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('does not intercept Enter inside a textarea', () => {
    const modal = new Modal({ content: '<textarea></textarea>', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const submit = vi.fn();
    modal.on('submit', submit);
    const textarea = (modal.el as HTMLElement).querySelector('textarea') as HTMLTextAreaElement;
    textarea.focus();
    textarea.dispatchEvent(key('Enter'));
    expect(submit).not.toHaveBeenCalled();
  });

  it('does not intercept Enter inside a contenteditable element', () => {
    const modal = new Modal({ content: '<div contenteditable="true" tabindex="0"></div>', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const submit = vi.fn();
    modal.on('submit', submit);
    const editable = (modal.el as HTMLElement).querySelector('[contenteditable]') as HTMLElement;
    editable.focus();
    editable.dispatchEvent(key('Enter'));
    expect(submit).not.toHaveBeenCalled();
  });

  it('does not intercept Enter when a button is focused', () => {
    const modal = new Modal({ content: '<button id="b">go</button>', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const submit = vi.fn();
    modal.on('submit', submit);
    const button = (modal.el as HTMLElement).querySelector('#b') as HTMLButtonElement;
    button.focus();
    button.dispatchEvent(key('Enter'));
    expect(submit).not.toHaveBeenCalled();
  });

  it('ignores Enter while composing (IME)', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const submit = vi.fn();
    modal.on('submit', submit);
    document.body.dispatchEvent(key('Enter', { isComposing: true }));
    expect(submit).not.toHaveBeenCalled();
  });
});
