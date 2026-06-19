// Rehype transform that turns inline citation markers like `[1]` or `[2]` in
// assistant answers into a dedicated <cite data-index="n"> element, which the
// renderer maps to an interactive citation badge. Operates on the hast tree so
// it composes with the rest of the markdown pipeline (code blocks, links, etc.)
// are left untouched.

// Minimal hast node shapes — we avoid a direct `hast` dependency so this stays
// usable without pulling unist types into the bundle.
interface HastText {
  type: "text";
  value: string;
}

interface HastElement {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastNode[];
}

interface HastRoot {
  type: "root";
  children: HastNode[];
}

type HastNode = HastText | HastElement | HastRoot | { type: string };

// Matches one or more adjacent markers: [1], [1][2], [1, 2].
const CITATION_PATTERN = /\[(\d+(?:\s*[,;]\s*\d+)*)\]/g;
// Non-stateful detector (the global pattern above tracks lastIndex).
const HAS_CITATION = /\[\d+(?:\s*[,;]\s*\d+)*\]/;

// Never rewrite markers inside these elements (code samples, existing links).
const SKIP_TAGS = new Set(["code", "pre", "a", "cite"]);

function isElement(node: HastNode): node is HastElement {
  return node.type === "element";
}

function hasChildren(node: HastNode): node is HastElement | HastRoot {
  return (
    (node.type === "element" || node.type === "root") &&
    Array.isArray((node as HastElement | HastRoot).children)
  );
}

function citeElement(index: string): HastElement {
  return {
    type: "element",
    tagName: "cite",
    properties: { dataIndex: index },
    children: [{ type: "text", value: `[${index}]` }],
  };
}

// Split a text value into alternating text / <cite> nodes. Returns the original
// single node (unchanged identity not required) when there are no markers.
function splitTextValue(value: string): HastNode[] {
  CITATION_PATTERN.lastIndex = 0;
  const nodes: HastNode[] = [];
  let lastIndex = 0;
  let match = CITATION_PATTERN.exec(value);

  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }
    // Expand grouped markers ("[1, 2]") into separate badges.
    const indices = match[1].split(/\s*[,;]\s*/);
    for (const index of indices) {
      nodes.push(citeElement(index));
    }
    lastIndex = match.index + match[0].length;
    match = CITATION_PATTERN.exec(value);
  }

  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }

  return nodes;
}

function transform(node: HastNode): void {
  if (!hasChildren(node)) {
    return;
  }
  if (isElement(node) && SKIP_TAGS.has(node.tagName)) {
    return;
  }

  const next: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && HAS_CITATION.test((child as HastText).value)) {
      next.push(...splitTextValue((child as HastText).value));
    } else {
      transform(child);
      next.push(child);
    }
  }
  node.children = next;
}

export function rehypeInlineCitations() {
  return (tree: HastRoot): void => {
    transform(tree);
  };
}
