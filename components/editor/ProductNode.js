import { Node } from "@tiptap/core";

const ProductNode = Node.create({
  name: "product",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      onProductClick: null,
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.dataset.productNode = "true";
      dom.contentEditable = "false";

      if (this.options.onProductClick) {
        dom.classList.add("product-node-clickable");
        dom.addEventListener("click", (event) => {
          if (event.target instanceof Element && event.target.closest("button")) return;

          event.preventDefault();
          event.stopPropagation();
          this.options.onProductClick(node.attrs.productId);
        });
      }

      const content = document.createElement("div");
      content.className = "product-node-content";

      const name = document.createElement("strong");
      name.textContent = node.attrs.name;
      content.appendChild(name);

      const description = document.createElement("p");
      description.textContent = node.attrs.description || "";
      content.appendChild(description);

      if (node.attrs.productType === "Produto" && node.attrs.price != null) {
        const price = document.createElement("p");
        price.textContent = `${Number(node.attrs.price).toFixed(2)} €`;
        content.appendChild(price);
      }

      const actions = document.createElement("div");
      actions.className = "product-node-actions";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "product-node-delete";
      deleteButton.textContent = "Remover";
      deleteButton.title = "Remover produto";
      deleteButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const position = getPos();
        editor
          .chain()
          .focus()
          .deleteRange({ from: position, to: position + node.nodeSize })
          .run();
      };
      actions.appendChild(deleteButton);

      if (node.attrs.imageUrl) {
        const image = document.createElement("img");
        image.src = node.attrs.imageUrl;
        image.alt = node.attrs.name;
        dom.appendChild(image);
      }

      dom.prepend(content);
      dom.appendChild(actions);

      return { dom };
    };
  },

  addAttributes() {
    return {
      productId: { default: null },
      name: { default: "Produto sem nome" },
      description: { default: "" },
      imageUrl: { default: "" },
      productType: { default: "" },
      price: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-product-node]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const content = [
      ["strong", {}, HTMLAttributes.name],
      HTMLAttributes.description
        ? ["p", {}, HTMLAttributes.description]
        : ["p", {}, ""],
    ];

    if (HTMLAttributes.productType === "Produto" && HTMLAttributes.price != null) {
      content.push(["p", {}, `${Number(HTMLAttributes.price).toFixed(2)} €`]);
    }

    const children = [
      ["div", { class: "product-node-content" }, ...content],
    ];

    if (HTMLAttributes.imageUrl) {
      children.push([
        "img",
        { src: HTMLAttributes.imageUrl, alt: HTMLAttributes.name },
      ]);
    }

    return ["div", { ...HTMLAttributes, "data-product-node": "true" }, ...children];
  },
});

export default ProductNode;
