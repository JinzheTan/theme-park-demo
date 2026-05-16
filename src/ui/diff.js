/**
 * Minimal DOM diffing helpers. The point: stop nuking innerHTML every frame so
 * we don't lose focus rings, transitions, or input state mid-interaction.
 */

export function setText(node, text) {
  const value = String(text);
  if (node.textContent !== value) node.textContent = value;
}

export function setClass(node, name, on) {
  node.classList.toggle(name, Boolean(on));
}

export function setAttr(node, attr, value) {
  const current = node.getAttribute(attr);
  if (current !== value) {
    if (value == null) node.removeAttribute(attr);
    else node.setAttribute(attr, value);
  }
}

/**
 * Diff a homogenous list into `host`. Each item must have a stable key.
 *
 * @param {HTMLElement} host
 * @param {Array} items
 * @param {(item) => string} keyFn
 * @param {(item) => HTMLElement} createFn   build a new node for first mount
 * @param {(item, node) => void} updateFn    mutate an existing node in place
 */
export function renderList(host, items, keyFn, createFn, updateFn) {
  const existing = new Map();
  for (const child of [...host.children]) {
    const key = child.dataset.key;
    if (key != null) existing.set(key, child);
  }

  let cursor = null;
  for (const item of items) {
    const key = String(keyFn(item));
    let node = existing.get(key);
    if (!node) {
      node = createFn(item);
      node.dataset.key = key;
    } else {
      existing.delete(key);
    }
    updateFn(item, node);
    // place node after `cursor` (or at start)
    const next = cursor ? cursor.nextSibling : host.firstChild;
    if (next !== node) host.insertBefore(node, next);
    cursor = node;
  }

  for (const orphan of existing.values()) host.removeChild(orphan);
}

/** Build an element from a tag with optional className. */
export function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
