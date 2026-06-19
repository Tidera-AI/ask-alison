import { describe, expect, it } from "vitest";
import { rehypeInlineCitations } from "./rehype-inline-citations";

type Node = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

function text(value: string): Node {
  return { type: "text", value };
}

function el(tagName: string, children: Node[]): Node {
  return { type: "element", tagName, children };
}

function root(children: Node[]): Node {
  return { type: "root", children };
}

function run(tree: Node): Node {
  const transform = rehypeInlineCitations();
  transform(tree as unknown as Parameters<typeof transform>[0]);
  return tree;
}

describe("rehypeInlineCitations", () => {
  it("replaces a single marker with a cite element", () => {
    const tree = run(root([el("p", [text("Apologize sincerely [1].")])]));
    const p = tree.children?.[0];
    expect(p?.children).toHaveLength(3);
    expect(p?.children?.[0]).toEqual(text("Apologize sincerely "));
    expect(p?.children?.[1]).toMatchObject({
      tagName: "cite",
      properties: { dataIndex: "1" },
    });
    expect(p?.children?.[2]).toEqual(text("."));
  });

  it("expands grouped markers into separate cites", () => {
    const tree = run(root([el("p", [text("Both apply [1, 2].")])]));
    const cites = tree.children?.[0].children?.filter(
      (n) => n.tagName === "cite"
    );
    expect(cites).toHaveLength(2);
    expect(cites?.map((c) => c.properties?.dataIndex)).toEqual(["1", "2"]);
  });

  it("handles adjacent markers", () => {
    const tree = run(root([el("p", [text("Strong [1][3] claim")])]));
    const cites = tree.children?.[0].children?.filter(
      (n) => n.tagName === "cite"
    );
    expect(cites?.map((c) => c.properties?.dataIndex)).toEqual(["1", "3"]);
  });

  it("ignores markers inside code and links", () => {
    const tree = run(
      root([
        el("pre", [el("code", [text("arr[1]")])]),
        el("a", [text("see [2]")]),
      ])
    );
    const code = tree.children?.[0].children?.[0];
    expect(code?.children).toEqual([text("arr[1]")]);
    const anchor = tree.children?.[1];
    expect(anchor?.children).toEqual([text("see [2]")]);
  });

  it("leaves text without markers untouched", () => {
    const tree = run(root([el("p", [text("No citations here.")])]));
    expect(tree.children?.[0].children).toEqual([text("No citations here.")]);
  });

  it("recurses into nested elements", () => {
    const tree = run(root([el("p", [el("strong", [text("Bold point [4]")])])]));
    const strong = tree.children?.[0].children?.[0];
    expect(strong?.children?.[1]).toMatchObject({
      tagName: "cite",
      properties: { dataIndex: "4" },
    });
  });
});
