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
      dom.className = "editor-image-node";

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.style.width = "100%";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "8px";
      img.style.display = "block";

      const btn = document.createElement("button");
      btn.innerHTML = "✕";
      btn.type = "button";
      btn.setAttribute("aria-label", "Eliminar imagem");
      btn.className = "editor-image-delete";

      btn.onclick = () => {
        const pos = getPos();
        editor.chain().focus().deleteRange({
          from: pos,
          to: pos + node.nodeSize,
        }).run();
      };

      const resizeHandle = document.createElement("button");
      resizeHandle.type = "button";
      resizeHandle.className = "editor-image-resize";
      resizeHandle.setAttribute("aria-label", "Redimensionar imagem");
      resizeHandle.title = "Arraste para redimensionar";

      let resizeState = null;
      resizeHandle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        resizeHandle.setPointerCapture(event.pointerId);
        resizeState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startWidth: img.getBoundingClientRect().width,
          maxWidth: editor.view.dom.clientWidth,
        };
      });

      resizeHandle.addEventListener("pointermove", (event) => {
        if (!resizeState || event.pointerId !== resizeState.pointerId) return;

        const width = Math.min(
          resizeState.maxWidth,
          Math.max(50, resizeState.startWidth + event.clientX - resizeState.startX)
        );
        dom.style.width = `${width}px`;
      });

      resizeHandle.addEventListener("pointerup", (event) => {
        if (!resizeState || event.pointerId !== resizeState.pointerId) return;

        const width = Math.min(
          resizeState.maxWidth,
          Math.max(50, resizeState.startWidth + event.clientX - resizeState.startX)
        );
        const position = getPos();
        resizeState = null;
        if (typeof position !== "number") return;

        const currentNode = editor.state.doc.nodeAt(position);
        if (!currentNode || currentNode.type.name !== "image") return;

        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(position, undefined, {
            ...currentNode.attrs,
            width: Math.round(width),
          })
        );
      });

      function updateNodeView(updatedNode) {
        img.src = updatedNode.attrs.src;
        img.alt = updatedNode.attrs.alt || "";
        const width = updatedNode.attrs.width;
        dom.style.width = width ? `${width}px` : "100%";
        img.style.width = "100%";
        node = updatedNode;
      }

      dom.appendChild(img);
      dom.appendChild(btn);
      dom.appendChild(resizeHandle);
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