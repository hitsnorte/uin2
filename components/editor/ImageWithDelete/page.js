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
      height: {
        default: null,
        parseHTML: (element) => {
          const heightAttribute = element.getAttribute("height");
          const styleHeight = element.style.height;
          const height = Number(
            heightAttribute ||
              (styleHeight.endsWith("px") ? parseFloat(styleHeight) : NaN)
          );
          return Number.isFinite(height) && height > 0 ? height : null;
        },
        renderHTML: ({ height }) =>
          height
            ? {
                height,
                style: `height: ${height}px;`,
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
    const options = this.options;

    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.style.position = "relative";
      dom.style.maxWidth = "100%";
      dom.className = "editor-image-node";

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.style.width = "100%";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";

      const dimensions = document.createElement("span");
      dimensions.className = "editor-image-dimensions";
      dimensions.setAttribute("aria-live", "polite");

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "editor-image-edit";
      editButton.textContent = "Editar";
      editButton.setAttribute("aria-label", "Editar dimensões da imagem");
      editButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const position = getPos();
        if (typeof position !== "number") return;

        const rect = img.getBoundingClientRect();
        options.onImageEdit?.(position, {
          width: Math.round(rect.width) || node.attrs.width || img.naturalWidth,
          height:
            Math.round(rect.height) || node.attrs.height || img.naturalHeight,
        });
      };

      const btn = document.createElement("button");
      btn.innerHTML = "✕";
      btn.type = "button";
      btn.setAttribute("aria-label", "Eliminar imagem");
      btn.className = "editor-image-delete";

      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
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
        const rect = img.getBoundingClientRect();
        resizeState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startWidth: rect.width,
          startHeight: rect.height,
          maxWidth: editor.view.dom.clientWidth,
        };
      });

      resizeHandle.addEventListener("pointermove", (event) => {
        if (!resizeState || event.pointerId !== resizeState.pointerId) return;

        const width = getResizedWidth(event);
        const height =
          resizeState.startHeight * (width / resizeState.startWidth);
        dom.style.width = `${width}px`;
        img.style.height = `${height}px`;
        updateDimensions();
      });

      resizeHandle.addEventListener("pointerup", (event) => {
        if (!resizeState || event.pointerId !== resizeState.pointerId) return;

        const width = getResizedWidth(event);
        const height =
          resizeState.startHeight * (width / resizeState.startWidth);
        const position = getPos();
        resizeState = null;
        if (typeof position !== "number") return;

        const currentNode = editor.state.doc.nodeAt(position);
        if (!currentNode || currentNode.type.name !== "image") return;

        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(position, undefined, {
            ...currentNode.attrs,
            width: Math.round(width),
            height: Math.round(height),
          })
        );
      });

      function getResizedWidth(event) {
        return Math.min(
          resizeState.maxWidth,
          Math.max(
            50,
            resizeState.startWidth + event.clientX - resizeState.startX
          )
        );
      }

      function updateNodeView(updatedNode) {
        img.src = updatedNode.attrs.src;
        img.alt = updatedNode.attrs.alt || "";
        const width = updatedNode.attrs.width;
        const height = updatedNode.attrs.height;
        dom.style.display = "inline-block";
        dom.style.width = width ? `${width}px` : "auto";
        img.style.display = "block";
        img.style.width = width ? "100%" : "auto";
        img.style.height = height ? `${height}px` : "auto";
        node = updatedNode;
        updateDimensions();
      }

      function updateDimensions() {
        const rect = img.getBoundingClientRect();
        if (rect.width && rect.height) {
          dimensions.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;
        }
      }

      img.addEventListener("load", updateDimensions);
      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(updateDimensions);
      resizeObserver?.observe(img);
      dom.appendChild(img);
      dom.appendChild(dimensions);
      dom.appendChild(editButton);
      dom.appendChild(btn);
      dom.appendChild(resizeHandle);
      updateNodeView(node);

      return {
        dom,
        stopEvent(event) {
          return (
            event.target === btn ||
            event.target === editButton ||
            event.target === resizeHandle
          );
        },
        update(updatedNode) {
          if (updatedNode.type !== node.type) return false;
          updateNodeView(updatedNode);
          return true;
        },
        destroy() {
          resizeObserver?.disconnect();
          img.removeEventListener("load", updateDimensions);
        },
      };
    };
  },

  addOptions() {
    return {
      ...this.parent?.(),
      onImageEdit: null,
    };
  },
});

export default ImageWithDelete;