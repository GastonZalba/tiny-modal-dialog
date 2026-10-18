import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Modal } from '../src/index';

beforeEach(() => {
  document.body.className = '';
  document.body.innerHTML = '';
});

afterEach(() => {
  Modal.resetStrings();
});

function footerButtons(modal: Modal): HTMLButtonElement[] {
  return Array.from((modal.el as HTMLElement).querySelectorAll('.mtmodal-footer button'));
}

describe('Modal strings', () => {
  it('uses English defaults', () => {
    const modal = new Modal({ content: 'x' });
    expect(footerButtons(modal).map((b) => b.textContent)).toEqual(['Cancel', 'OK']);
    const close = (modal.el as HTMLElement).querySelector('.mtmodal-close');
    expect(close?.getAttribute('aria-label')).toBe('Close');
  });

  it('accepts a per-instance strings option', () => {
    const modal = new Modal({
      content: 'x',
      strings: { ok: 'Save', cancel: 'Discard', close: 'Dismiss' }
    });
    expect(footerButtons(modal).map((b) => b.textContent)).toEqual(['Discard', 'Save']);
    const close = (modal.el as HTMLElement).querySelector('.mtmodal-close');
    expect(close?.getAttribute('aria-label')).toBe('Dismiss');
  });

  it('merges partial strings with the global defaults', () => {
    const modal = new Modal({ content: 'x', strings: { ok: 'Save' } });
    expect(footerButtons(modal).map((b) => b.textContent)).toEqual(['Cancel', 'Save']);
  });

  it('applies global strings to new instances', () => {
    Modal.strings = { ok: 'Yes', cancel: 'No', close: 'Close' };
    const modal = new Modal({ content: 'x' });
    expect(footerButtons(modal).map((b) => b.textContent)).toEqual(['No', 'Yes']);
    expect((modal.el as HTMLElement).querySelector('.mtmodal-close')?.getAttribute('aria-label')).toBe('Close');
  });

  it('lets instance strings override global strings', () => {
    Modal.strings = { ok: 'Yes' };
    const modal = new Modal({ content: 'x', strings: { ok: 'Accept' } });
    expect(footerButtons(modal).map((b) => b.textContent)).toEqual(['Cancel', 'Accept']);
  });

  it('exposes the current strings through the getter as a copy', () => {
    Modal.strings = { ok: 'Accept' };
    const strings = Modal.strings;
    strings.ok = 'mutated';
    expect(Modal.strings.ok).toBe('Accept');
  });

  it('resetStrings restores the defaults', () => {
    Modal.strings = { ok: 'Accept' };
    Modal.resetStrings();
    expect(Modal.strings).toEqual({ ok: 'OK', cancel: 'Cancel', close: 'Close' });
  });

  it('uses strings.ok in Modal.alert', () => {
    const modal = Modal.alert('Hello', { strings: { ok: 'Accept' } });
    expect(footerButtons(modal).map((b) => b.textContent)).toEqual(['Accept']);
  });

  it('uses global strings in Modal.confirm', () => {
    Modal.strings = { ok: 'Yes', cancel: 'No' };
    const modal = Modal.confirm('Continue?');
    expect(footerButtons(modal).map((b) => b.textContent)).toEqual(['No', 'Yes']);
  });
});
