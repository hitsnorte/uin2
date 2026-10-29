import Image from "@tiptap/extension-image";
import { Extension, Mark } from "@tiptap/core";

export const ContentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const widthAttribute = element.getAttribute("width");
          const styleWidth = element.style.width;
          const width = Number(
            widthAttribute ||
              (styleWidth.endsWith("px") ? parseFloat(styleWidth) : NaN)
          );
          return Number.isFinite(width) && width > 0 ? width : null;
        },
        renderHTML: ({ width }) =>
          width
            ? {
                width,
                style: `width: ${width}px; max-width: 100%;`,
              }
            : {},
      },
    };
  },
});

export const TextAlign = Extension.create({
  name: "textAlign",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => element.style.textAlign || null,
            renderHTML: ({ textAlign }) => {
              const allowedAlignments = ["left", "center", "right", "justify"];
              return allowedAlignments.includes(textAlign)
                ? { style: `text-align: ${textAlign}` }
                : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (textAlign) =>
        ({ commands, editor }) =>
          commands.updateAttributes(
            editor.isActive("heading") ? "heading" : "paragraph",
            { textAlign }
          ),
      unsetTextAlign:
        () =>
        ({ commands, editor }) =>
          commands.resetAttributes(
            editor.isActive("heading") ? "heading" : "paragraph",
            "textAlign"
          ),
    };
  },
});

export const Underline = Mark.create({
  name: "underline",

  parseHTML() {
    return [{ tag: "u" }, { style: "text-decoration=underline" }];
  },

  renderHTML() {
    return ["u", 0];
  },
});

const ImageWithDelete = ContentImage.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.style.position = "relative";
      dom.style.display = "block";
      dom.style.maxWidth = "100%";

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.style.width = "100%";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "8px";
      img.style.display = "block";

      const btn = document.createElement("button");
      btn.innerHTML = "✕";

      btn.style.position = "absolute";
      btn.style.top = "6px";
      btn.style.right = "6px";
      btn.style.background = "rgba(0,0,0,0.6)";
      btn.style.color = "white";
      btn.style.border = "none";
      btn.style.borderRadius = "6px";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "12px";
      btn.style.padding = "2px 6px";
      btn.style.display = "none";

      btn.onclick = () => {
        const pos = getPos();
        editor.chain().focus().deleteRange({
          from: pos,
          to: pos + node.nodeSize,
        }).run();
      };

      dom.onmouseenter = () => {
        btn.style.display = "block";
      };

      dom.onmouseleave = () => {
        btn.style.display = "none";
      };

      function updateNodeView(updatedNode) {
        img.src = updatedNode.attrs.src;
        img.alt = updatedNode.attrs.alt || "";
        dom.style.width = updatedNode.attrs.width
          ? `${updatedNode.attrs.width}px`
          : "100%";
        node = updatedNode;
      }

      dom.appendChild(img);
      dom.appendChild(btn);
      updateNodeView(node);

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type !== node.type) return false;
          updateNodeView(updatedNode);
          return true;
        },
      };
    };
  },
});

export default ImageWithDelete;