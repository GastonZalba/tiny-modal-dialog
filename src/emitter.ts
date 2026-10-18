export type EventListener = (...args: any[]) => void;

type ListenerEntry = {
  fn: EventListener;
  once: boolean;
};

export class Emitter<
  Events extends Record<string, unknown[]> = Record<string, unknown[]>,
> {
  private _listeners = new Map<string, ListenerEntry[]>();

  on<K extends keyof Events & string>(
    event: K,
    listener: (...args: Events[K]) => void,
  ): this;
  on(event: string, listener: EventListener): this;
  on(event: string, listener: EventListener): this {
    const list = this._listeners.get(event);
    if (list) {
      list.push({ fn: listener, once: false });
    } else {
      this._listeners.set(event, [{ fn: listener, once: false }]);
    }
    return this;
  }

  once<K extends keyof Events & string>(
    event: K,
    listener: (...args: Events[K]) => void,
  ): this;
  once(event: string, listener: EventListener): this;
  once(event: string, listener: EventListener): this {
    const list = this._listeners.get(event);
    if (list) {
      list.push({ fn: listener, once: true });
    } else {
      this._listeners.set(event, [{ fn: listener, once: true }]);
    }
    return this;
  }

  off<K extends keyof Events & string>(
    event: K,
    listener?: (...args: Events[K]) => void,
  ): this;
  off(event: string, listener?: EventListener): this;
  off(event: string, listener?: EventListener): this {
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

  removeListener<K extends keyof Events & string>(
    event: K,
    listener?: (...args: Events[K]) => void,
  ): this;
  removeListener(event: string, listener?: EventListener): this;
  removeListener(event: string, listener?: EventListener): this {
    return this.off(event, listener);
  }

  removeAllListeners<K extends keyof Events & string>(event?: K): this;
  removeAllListeners(event?: string): this;
  removeAllListeners(event?: string): this {
    if (event === undefined) {
      this._listeners.clear();
    } else {
      this._listeners.delete(event);
    }
    return this;
  }

  emit<K extends keyof Events & string>(event: K, ...args: Events[K]): boolean;
  emit(event: string, ...args: unknown[]): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    const list = this._listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const entry of [...list]) {
      if (entry.once) this.off(event, entry.fn as EventListener);
      (entry.fn as EventListener)(...args);
    }
    return true;
  }

  listenerCount(event: string): number {
    return this._listeners.get(event)?.length ?? 0;
  }
}
