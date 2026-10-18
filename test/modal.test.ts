import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../src/index';

function mountStatic(): HTMLElement {
  document.body.innerHTML = `
    <div class="mtmodal mtmodal-fade" id="static-modal">
      <div class="mtmodal-dialog">
        <div class="mtmodal-content">
          <div class="mtmodal-header"><h4 class="mtmodal-title">Static</h4></div>
          <div class="mtmodal-body">Static body</div>
          <div class="mtmodal-footer"></div>
        </div>
      </div>
    </div>`;
  return document.getElementById('static-modal') as HTMLElement;
}

beforeEach(() => {
  document.body.className = '';
  document.body.style.paddingRight = '';
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Modal (construct)', () => {
  it('builds the expected DOM structure', () => {
    const modal = new Modal({ title: 'Hello', content: 'World' });
    const el = modal.el as HTMLElement;

    expect(el.classList.contains('mtmodal')).toBe(true);
    expect(el.classList.contains('mtmodal-fade')).toBe(true);
    expect(el.querySelector('.mtmodal-dialog')).not.toBeNull();
    expect(el.querySelector('.mtmodal-content')).not.toBeNull();
    expect(el.querySelector('.mtmodal-title')?.textContent).toBe('Hello');
    expect(el.querySelector('.mtmodal-body')?.innerHTML).toBe('World');
    expect(el.querySelector('.mtmodal-close')).not.toBeNull();
    expect(el.querySelectorAll('.mtmodal-footer button')).toHaveLength(2);
  });

  it('omits animation class when animate is false', () => {
    const modal = new Modal({ content: 'x', animate: false });
    expect((modal.el as HTMLElement).classList.contains('mtmodal-fade')).toBe(false);
  });

  it('omits header and footer when disabled', () => {
    const modal = new Modal({ content: 'x', header: false, footer: false });
    const el = modal.el as HTMLElement;
    expect(el.querySelector('.mtmodal-header')).toBeNull();
    expect(el.querySelector('.mtmodal-footer')).toBeNull();
  });

  it('keeps the exact node reference for content and preserves listeners', () => {
    const node = document.createElement('div');
    node.className = 'custom';
    const handler = vi.fn();
    node.addEventListener('click', handler);

    const modal = new Modal({ content: node });
    const body = (modal.el as HTMLElement).querySelector('.mtmodal-body') as HTMLElement;

    expect(body.firstElementChild).toBe(node);
    node.dispatchEvent(new MouseEvent('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('keeps the exact node reference for title', () => {
    const titleNode = document.createElement('h2');
    titleNode.textContent = 'Node title';
    const modal = new Modal({ title: titleNode });
    const header = (modal.el as HTMLElement).querySelector('.mtmodal-header') as HTMLElement;
    expect(header.firstElementChild).toBe(titleNode);
  });

  it('keeps the exact node reference for footer', () => {
    const footerNode = document.createElement('div');
    footerNode.textContent = 'Footer node';
    const modal = new Modal({ footer: footerNode });
    const footer = (modal.el as HTMLElement).querySelector('.mtmodal-footer') as HTMLElement;
    expect(footer.firstElementChild).toBe(footerNode);
  });

  it('accepts string footer markup', () => {
    const modal = new Modal({ footer: '<button>Custom</button>' });
    const footer = (modal.el as HTMLElement).querySelector('.mtmodal-footer') as HTMLElement;
    expect(footer.innerHTML).toBe('<button>Custom</button>');
  });
});

describe('Modal (existing element)', () => {
  it('maps an existing DOM element without rebuilding it', () => {
    const el = mountStatic();
    const modal = new Modal({ el });

    expect(modal.el).toBe(el);
    expect(modal.visible).toBe(false);
    expect(Modal.getInstance(el)).toBe(modal);
    expect(Modal.getInstance(document.createElement('div'))).toBeNull();
  });

  it('preserves existing title/content in mapped mode', () => {
    const el = mountStatic();
    const modal = new Modal({ el, title: false, content: false });
    expect(el.querySelector('.mtmodal-title')?.textContent).toBe('Static');
    expect(el.querySelector('.mtmodal-body')?.textContent).toBe('Static body');
    expect(modal.el).toBe(el);
  });

  it('resolves el from a selector string', () => {
    const el = mountStatic();
    const modal = new Modal({ el: '#static-modal' });
    expect(modal.el).toBe(el);
  });

  it('throws when the el selector does not match', () => {
    expect(() => new Modal({ el: '#missing' })).toThrow(/not found/);
  });

  it('throws when appendTo does not match', () => {
    expect(() => new Modal({ content: 'x', appendTo: '#missing' })).toThrow(/not found/);
  });
});

describe('Modal lifecycle', () => {
  it('emits show -> shown -> hide -> hidden and toggles body class', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    const events: string[] = [];
    modal.on('show', () => events.push('show'));
    modal.on('shown', () => events.push('shown'));
    modal.on('hide', () => events.push('hide'));
    modal.on('hidden', () => events.push('hidden'));

    expect(modal.show()).toBe(modal);
    expect(events).toEqual(['show']);
    expect(document.body.classList.contains('mtmodal-open')).toBe(true);

    vi.advanceTimersByTime(300);
    expect(modal.visible).toBe(true);
    expect(events).toEqual(['show', 'shown']);

    expect(modal.hide()).toBe(modal);
    expect(events).toEqual(['show', 'shown', 'hide']);
    vi.advanceTimersByTime(150);
    expect(document.body.classList.contains('mtmodal-open')).toBe(false);
    vi.advanceTimersByTime(300);
    expect(modal.visible).toBe(false);
    expect(events).toEqual(['show', 'shown', 'hide', 'hidden']);
  });

  it('appends constructed markup on show and detaches it on hide', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    const el = modal.el as HTMLElement;
    expect(document.body.contains(el)).toBe(false);
    modal.show();
    vi.advanceTimersByTime(300);
    expect(document.body.contains(el)).toBe(true);
    modal.hide();
    vi.advanceTimersByTime(300);
    expect(document.body.contains(el)).toBe(false);
  });

  it('leaves mapped elements attached on hide', () => {
    const el = mountStatic();
    const modal = new Modal({ el, backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);
    modal.hide();
    vi.advanceTimersByTime(300);
    expect(document.body.contains(el)).toBe(true);
  });

  it('toggle shows when hidden and hides when active', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    modal.toggle();
    expect(modal.visible).toBe(false);
    vi.advanceTimersByTime(300);
    expect(modal.visible).toBe(true);
    modal.toggle();
    vi.advanceTimersByTime(300);
    expect(modal.visible).toBe(false);
  });

  it('ignores duplicate show calls', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    const spy = vi.fn();
    modal.on('show', spy);
    modal.show();
    modal.show();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('Modal backdrop', () => {
  it('creates a backdrop and dismisses on outside click when true', () => {
    const modal = new Modal({ content: 'x' });
    modal.show();
    vi.advanceTimersByTime(150);
    vi.advanceTimersByTime(300);
    expect(document.querySelector('.mtmodal-backdrop')).not.toBeNull();

    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    (modal.el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(dismiss.mock.calls[0]?.[2] ?? null).toBeNull();
  });

  it('does not dismiss on outside click when static', () => {
    const modal = new Modal({ content: 'x', backdrop: 'static' });
    modal.show();
    vi.advanceTimersByTime(150);
    vi.advanceTimersByTime(300);
    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    (modal.el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('does not create a backdrop nor dismiss when false', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);
    expect(document.querySelector('.mtmodal-backdrop')).toBeNull();
    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    (modal.el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('does not dismiss when the click starts inside the content', () => {
    const modal = new Modal({ content: 'x' });
    modal.show();
    vi.advanceTimersByTime(150);
    vi.advanceTimersByTime(300);

    const content = (modal.el as HTMLElement).querySelector('.mtmodal-content') as HTMLElement;
    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    (modal.el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('dismisses with the button payload on data-mt-dismiss click', () => {
    const modal = new Modal({ content: 'x', backdrop: false });
    modal.show();
    vi.advanceTimersByTime(300);

    const dismiss = vi.fn();
    modal.on('dismiss', dismiss);
    const ok = (modal.el as HTMLElement).querySelector('.mtmodal-btn-primary') as HTMLElement;
    ok.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(dismiss.mock.calls[0]?.[2]).toEqual({ text: 'OK', value: true });
    vi.advanceTimersByTime(300);
    expect(modal.visible).toBe(false);
  });
});

describe('Modal setContent', () => {
  it('updates content from string, node and false', () => {
    const modal = new Modal({ content: 'a', backdrop: false });
    const body = () => (modal.el as HTMLElement).querySelector('.mtmodal-body') as HTMLElement;

    expect(body().innerHTML).toBe('a');

    expect(modal.setContent('<p>hi</p>')).toBe(modal);
    expect(body().innerHTML).toBe('<p>hi</p>');

    const node = document.createElement('span');
    node.textContent = 'node';
    modal.setContent(node);
    expect(body().firstElementChild).toBe(node);

    modal.setContent(false);
    expect(body().childNodes).toHaveLength(0);
  });
});
