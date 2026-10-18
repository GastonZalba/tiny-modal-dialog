import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../src/index';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.className = '';
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Modal theme', () => {
  it('adds no theme class by default (light)', () => {
    const modal = new Modal({ content: 'x' });
    const el = modal.el as HTMLElement;
    expect(el.classList.contains('mtmodal-dark')).toBe(false);
    expect(el.classList.contains('mtmodal-auto')).toBe(false);
  });

  it('adds the dark class to the container', () => {
    const modal = new Modal({ content: 'x', theme: 'dark' });
    expect((modal.el as HTMLElement).classList.contains('mtmodal-dark')).toBe(true);
  });

  it('adds the auto class to the container', () => {
    const modal = new Modal({ content: 'x', theme: 'auto' });
    expect((modal.el as HTMLElement).classList.contains('mtmodal-auto')).toBe(true);
  });

  it('applies the dark class to the backdrop', () => {
    const modal = new Modal({ content: 'x', theme: 'dark' });
    modal.show();
    vi.advanceTimersByTime(150);
    vi.advanceTimersByTime(300);
    const backdrop = document.querySelector('.mtmodal-backdrop');
    expect(backdrop?.classList.contains('mtmodal-dark')).toBe(true);
  });

  it('applies the auto class to the backdrop', () => {
    const modal = new Modal({ content: 'x', theme: 'auto' });
    modal.show();
    vi.advanceTimersByTime(150);
    vi.advanceTimersByTime(300);
    const backdrop = document.querySelector('.mtmodal-backdrop');
    expect(backdrop?.classList.contains('mtmodal-auto')).toBe(true);
  });

  it('applies the dark class in el (mapped) mode', () => {
    document.body.innerHTML = `
      <div class="mtmodal mtmodal-fade" id="m">
        <div class="mtmodal-dialog"><div class="mtmodal-content">
          <div class="mtmodal-body">x</div>
        </div></div>
      </div>`;
    const el = document.getElementById('m') as HTMLElement;
    new Modal({ el, theme: 'dark' });
    expect(el.classList.contains('mtmodal-dark')).toBe(true);
  });
});
