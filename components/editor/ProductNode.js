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

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "product-node-action product-node-edit";
      editButton.disabled = true;
      editButton.setAttribute("aria-label", "Editar produto");
      editButton.title = "Editar produto";

      const editIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      editIcon.setAttribute("viewBox", "0 0 24 24");
      editIcon.setAttribute("aria-hidden", "true");
      editIcon.innerHTML =
        '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>';
      editButton.appendChild(editIcon);
      actions.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "product-node-action product-node-delete";
      deleteButton.setAttribute("aria-label", "Remover produto");
      deleteButton.title = "Remover produto";

      const deleteIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      deleteIcon.setAttribute("viewBox", "0 0 24 24");
      deleteIcon.setAttribute("aria-hidden", "true");
      deleteIcon.innerHTML =
        '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>';
      deleteButton.appendChild(deleteIcon);
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
