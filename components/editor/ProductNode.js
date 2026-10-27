import { Node } from "@tiptap/core";

const ProductNode = Node.create({
  name: "product",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      onProductClick: null,
      onProductEdit: null,
      onProductOrder: null,
    };
  },

  addNodeView() {
    const options = this.options;

    return ({ node: initialNode, editor, getPos }) => {
      let node = initialNode;
      const dom = document.createElement("div");
      dom.dataset.productNode = "true";
      dom.contentEditable = "false";

      if (options.onProductClick) {
        dom.classList.add("product-node-clickable");
        dom.addEventListener("click", (event) => {
          if (event.target instanceof Element && event.target.closest("button")) return;

          event.preventDefault();
          event.stopPropagation();
          options.onProductClick(
            node.attrs.productId,
            node.attrs.sourceItemId
          );
        });
      }

      const content = document.createElement("div");
      content.className = "product-node-content";

      const actions = document.createElement("div");
      actions.className = "product-node-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "product-node-action product-node-edit";
      editButton.disabled = typeof options.onProductEdit !== "function";
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
      editButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        options.onProductEdit?.(
          node.attrs.productId,
          node.attrs.sourceItemId
        );
      };
      actions.appendChild(editButton);

      const orderButton = document.createElement("button");
      orderButton.type = "button";
      orderButton.className = "product-node-order";
      orderButton.textContent = "Pedir";
      orderButton.setAttribute("aria-label", "Pedir produto");
      orderButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        options.onProductOrder?.(
          node.attrs.productId,
          node.attrs.sourceItemId
        );
      };
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

      let image = null;
      function updateNodeView(updatedNode) {
        node = updatedNode;
        const attrs = node.attrs;
        const requiresConfiguration = attrs.isConfigured === false;
        editButton.classList.toggle(
          "product-node-edit-required",
          requiresConfiguration
        );
        editButton.title = requiresConfiguration
          ? "Obrigatório: configurar e guardar produto"
          : "Editar produto";
        editButton.setAttribute(
          "aria-label",
          requiresConfiguration
            ? "Configurar e guardar produto (obrigatório)"
            : "Editar produto"
        );
        content.replaceChildren();

        const heading = document.createElement("div");
        heading.className = "product-node-heading";
        const name = document.createElement("strong");
        name.textContent = attrs.name;
        heading.appendChild(name);

        const canOrder =
          typeof options.onProductOrder === "function" &&
          [true, 1, "1"].includes(attrs.order);
        orderButton.hidden = !canOrder;
        if (canOrder) heading.appendChild(orderButton);
        content.appendChild(heading);

        const description = document.createElement("p");
        description.textContent = attrs.description || "";
        content.appendChild(description);

        if (attrs.productType === "Produto" && attrs.price != null) {
          const price = document.createElement("p");
          price.textContent = `${Number(attrs.price).toFixed(2)} €`;
          content.appendChild(price);
        }

        if (attrs.imageUrl) {
          if (!image) {
            image = document.createElement("img");
            dom.insertBefore(image, actions);
          }
          image.src = attrs.imageUrl;
          image.alt = attrs.name;
        } else if (image) {
          image.remove();
          image = null;
        }
      }

      dom.appendChild(content);
      dom.appendChild(actions);
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

  addAttributes() {
    return {
      productId: { default: null },
      sourceItemId: { default: null },
      name: { default: "Produto sem nome" },
      description: { default: "" },
      imageUrl: { default: "" },
      productType: { default: "" },
      price: { default: null },
      order: { default: false },
      isConfigured: { default: true },
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
