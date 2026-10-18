import { describe, expect, it, vi } from 'vitest';
import { Emitter } from '../src/emitter';

type Events = {
  ping: [value: number];
  empty: [];
};

describe('Emitter', () => {
  it('registers and calls listeners with args', () => {
    const emitter = new Emitter<Events>();
    const spy = vi.fn();
    emitter.on('ping', spy);
    expect(emitter.emit('ping', 42)).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(42);
  });

  it('supports chaining', () => {
    const emitter = new Emitter();
    expect(emitter.on('a', () => {})).toBe(emitter);
    expect(emitter.once('b', () => {})).toBe(emitter);
    expect(emitter.off('a')).toBe(emitter);
    expect(emitter.removeAllListeners()).toBe(emitter);
  });

  it('returns false when there are no listeners', () => {
    const emitter = new Emitter();
    expect(emitter.emit('nobody')).toBe(false);
  });

  it('calls multiple listeners in registration order', () => {
    const emitter = new Emitter();
    const calls: string[] = [];
    emitter.on('e', () => calls.push('first'));
    emitter.on('e', () => calls.push('second'));
    emitter.emit('e');
    expect(calls).toEqual(['first', 'second']);
  });

  it('once fires exactly once, even when emitted reentrantly', () => {
    const emitter = new Emitter();
    const spy = vi.fn();
    emitter.once('e', () => {
      spy();
      emitter.emit('e');
    });
    emitter.emit('e');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount('e')).toBe(0);
  });

  it('off removes a specific listener and keeps others', () => {
    const emitter = new Emitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on('e', a);
    emitter.on('e', b);
    emitter.off('e', a);
    emitter.emit('e');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('off with once-registered original listener removes it', () => {
    const emitter = new Emitter();
    const spy = vi.fn();
    emitter.once('e', spy);
    emitter.off('e', spy);
    emitter.emit('e');
    expect(spy).not.toHaveBeenCalled();
  });

  it('off without listener removes all listeners for the event', () => {
    const emitter = new Emitter();
    emitter.on('e', () => {});
    emitter.on('e', () => {});
    emitter.off('e');
    expect(emitter.listenerCount('e')).toBe(0);
  });

  it('off on unknown event is a no-op', () => {
    const emitter = new Emitter();
    expect(() => emitter.off('missing')).not.toThrow();
  });

  it('removeListener is an alias of off', () => {
    const emitter = new Emitter();
    const spy = vi.fn();
    emitter.on('e', spy);
    emitter.removeListener('e', spy);
    emitter.emit('e');
    expect(spy).not.toHaveBeenCalled();
  });

  it('removeAllListeners clears everything, per-event or globally', () => {
    const emitter = new Emitter();
    emitter.on('a', () => {});
    emitter.on('b', () => {});
    emitter.removeAllListeners('a');
    expect(emitter.listenerCount('a')).toBe(0);
    expect(emitter.listenerCount('b')).toBe(1);
    emitter.removeAllListeners();
    expect(emitter.listenerCount('b')).toBe(0);
  });

  it('iterates over a snapshot: listeners added during emit run on next emit', () => {
    const emitter = new Emitter();
    const b = vi.fn();
    const c = vi.fn();
    emitter.on('e', () => emitter.on('e', c));
    emitter.on('e', b);
    emitter.emit('e');
    expect(c).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    emitter.emit('e');
    expect(c).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });
});
