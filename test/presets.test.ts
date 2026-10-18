import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../src/index';

beforeEach(() => {
  document.body.className = '';
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Modal.alert', () => {
  it('builds a modal with the message as title and a single OK button', () => {
    const modal = Modal.alert('Saved successfully');
    const el = modal.el as HTMLElement;

    expect(modal).toBeInstanceOf(Modal);
    expect(modal.visible).toBe(false);
    expect(el.querySelector('.mtmodal-title')?.textContent).toBe('Saved successfully');
    expect(el.querySelector('.mtmodal-close')).toBeNull();
    const buttons = el.querySelectorAll('.mtmodal-footer button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe('OK');
    expect(el.querySelector('.mtmodal-body')?.childNodes).toHaveLength(0);
  });

  it('dismisses with the OK button payload', () => {
    const modal = Modal.alert('Hello');
    modal.show();
    vi.advanceTimersByTime(300);

    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    const ok = (modal.el as HTMLElement).querySelector('.mtmodal-footer button') as HTMLElement;
    ok.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(dismiss.mock.calls[0]?.[2]).toEqual({ text: 'OK', value: true });
  });
});

describe('Modal.confirm', () => {
  it('builds a modal with the question as title and Cancel/OK buttons', () => {
    const modal = Modal.confirm('Delete the record?');
    const el = modal.el as HTMLElement;

    expect(modal).toBeInstanceOf(Modal);
    expect(modal.visible).toBe(false);
    expect(el.querySelector('.mtmodal-title')?.textContent).toBe('Delete the record?');
    expect(el.querySelector('.mtmodal-close')).toBeNull();
    const buttons = el.querySelectorAll('.mtmodal-footer button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent).toBe('Cancel');
    expect(buttons[1]?.textContent).toBe('OK');
  });

  it('dismisses with the Cancel and OK payloads', () => {
    const modal = Modal.confirm('Continue?');
    modal.show();
    vi.advanceTimersByTime(300);

    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);

    const cancel = (modal.el as HTMLElement).querySelector('.mtmodal-btn-default') as HTMLElement;
    cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dismiss.mock.calls[0]?.[2]).toEqual({ text: 'Cancel', value: false });

    const confirm = Modal.confirm('Continue?');
    confirm.on('dismiss', dismiss);
    confirm.show();
    vi.advanceTimersByTime(300);
    const ok = (confirm.el as HTMLElement).querySelector('.mtmodal-btn-primary') as HTMLElement;
    ok.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dismiss).toHaveBeenLastCalledWith(confirm, expect.anything(), { text: 'OK', value: true });
  });
});

describe('alert/confirm options', () => {
  it('allows overriding the defaults', () => {
    const modal = Modal.alert('Message', { title: 'Custom title', headerClose: true, content: 'Detail' });
    const el = modal.el as HTMLElement;
    expect(el.querySelector('.mtmodal-title')?.textContent).toBe('Custom title');
    expect(el.querySelector('.mtmodal-close')).not.toBeNull();
    expect(el.querySelector('.mtmodal-body')?.innerHTML).toBe('Detail');
  });

  it('returns an independent instance each call', () => {
    const a = Modal.alert('uno');
    const b = Modal.alert('dos');
    expect(a).not.toBe(b);
    expect((a.el as HTMLElement).querySelector('.mtmodal-title')?.textContent).toBe('uno');
    expect((b.el as HTMLElement).querySelector('.mtmodal-title')?.textContent).toBe('dos');
  });
});
