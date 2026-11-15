// Small native SVG description/patch helpers; no UI framework or markup parsing.
export const SVG_NS = "http://www.w3.org/2000/svg";

export function svgNode(tag, attributes, ...children) {
  if (typeof tag === "function") return tag({ ...attributes, children });
  return {
    tag,
    attributes: attributes || {},
    children: children.flat(Infinity).filter(child => child != null && child !== false && child !== true),
  };
}

const attributeName = name => name === "viewBox" ? name : name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

function patchAttributes(element, attributes) {
  const next = {};
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "key" || value == null || /^on/i.test(name)) continue;
    if (name === "style") {
      next.style = Object.entries(value).map(([key, item]) => `${attributeName(key)}:${item}`).join(";");
    } else {
      next[attributeName(name)] = String(value);
    }
  }
  const previous = element.__occasionAttributes || {};
  for (const name of Object.keys(previous)) {
    if (!(name in next)) element.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(next)) {
    if (previous[name] !== value) element.setAttribute(name, value);
  }
  element.__occasionAttributes = next;
}

export function patchSvgChildren(parent, descriptions) {
  const children = Array.isArray(descriptions) ? descriptions : [descriptions];
  const doc = parent.ownerDocument || document;
  children.forEach((description, index) => {
    let child = parent.childNodes[index];
    if (typeof description === "string" || typeof description === "number") {
      if (!child || child.nodeType !== 3) {
        const text = doc.createTextNode(String(description));
        if (child) parent.replaceChild(text, child);
        else parent.appendChild(text);
      } else if (child.textContent !== String(description)) child.textContent = String(description);
      return;
    }
    if (!child || child.nodeType !== 1 || child.localName !== description.tag) {
      const element = doc.createElementNS(SVG_NS, description.tag);
      if (child) parent.replaceChild(element, child);
      else parent.appendChild(element);
      child = element;
    }
    patchAttributes(child, description.attributes);
    patchSvgChildren(child, description.children);
  });
  while (parent.childNodes.length > children.length) parent.lastChild.remove();
}
