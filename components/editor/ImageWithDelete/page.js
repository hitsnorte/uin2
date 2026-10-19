import Image from "@tiptap/extension-image";

const ImageWithDelete = Image.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.style.position = "relative";
      dom.style.display = "inline-block";

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.style.maxWidth = "100%";
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

      dom.appendChild(img);
      dom.appendChild(btn);

      return { dom };
    };
  },
});

export default ImageWithDelete;