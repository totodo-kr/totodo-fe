"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useCallback, useRef } from "react";


function ResizableImageComponent({ node, updateAttributes, selected }: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startWidth.current = node.attrs.width || containerRef.current?.offsetWidth || 300;

      const onMove = (e: MouseEvent) => {
        const newWidth = Math.max(80, startWidth.current + (e.clientX - startX.current));
        const maxWidth = containerRef.current?.parentElement?.offsetWidth ?? Infinity;
        updateAttributes({ width: Math.min(newWidth, maxWidth) });
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [node.attrs.width, updateAttributes]
  );

  return (
    <NodeViewWrapper>
      <div
        ref={containerRef}
        style={{ width: node.attrs.width ? `${node.attrs.width}px` : "100%", position: "relative", display: "inline-block" }}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || ""}
          draggable={false}
          style={{ width: "100%", height: "auto", display: "block" }}
          className={selected ? "ring-2 ring-brand-500 rounded" : "rounded"}
        />
        {selected && (
          <div
            onMouseDown={onMouseDown}
            className="absolute bottom-0 right-0 w-4 h-4 bg-brand-500 cursor-se-resize rounded-tl"
            style={{ userSelect: "none" }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("width");
          return w ? parseInt(w) : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { width: String(attrs.width) };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
