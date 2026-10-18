let factory: HTMLDivElement | null = null;

export function build<T extends HTMLElement = HTMLElement>(html: string): T {
  if (!factory) factory = document.createElement("div");
  factory.innerHTML = html.trim();
  const node = factory.firstElementChild as T | null;
  if (!node) throw new Error(`tiny-modal-dialog: invalid markup "${html}"`);
  factory.innerHTML = "";
  return node;
}

export function resolveElement(el: string | HTMLElement): HTMLElement | null {
  if (typeof el === "string") {
    return document.querySelector<HTMLElement>(el);
  }
  return el;
}

export function calcScrollbarWidth(): number {
  const outer = document.createElement("div");
  Object.assign(outer.style, {
    visibility: "hidden",
    width: "100px",
  });
  document.body.appendChild(outer);

  const outerWidth = outer.offsetWidth;
  outer.style.overflow = "scroll";

  const inner = document.createElement("div");
  inner.style.width = "100px";
  outer.appendChild(inner);

  const width = outerWidth - inner.offsetWidth;
  document.body.removeChild(outer);

  return width > 0 ? width : 0;
}
