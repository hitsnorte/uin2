"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import ImageWithDelete from "./ImageWithDelete/page";
import ProductNode from "./ProductNode";
import "./editor.css";

function collectProductIds(value, ids = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectProductIds(item, ids));
  } else if (value && typeof value === "object") {
    if (value.type === "product" && value.attrs?.productId != null) {
      ids.push(Number(value.attrs.productId));
    }

    Object.values(value).forEach((item) => collectProductIds(item, ids));
  }

  return [...new Set(ids.filter((id) => !Number.isNaN(id)))];
}

function hasIncompleteProductNode(value) {
  if (Array.isArray(value)) {
    return value.some(hasIncompleteProductNode);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  if (value.type === "product") {
    return !value.attrs?.name;
  }

  return Object.values(value).some(hasIncompleteProductNode);
}

function hydrateProductNodes(value, productsById) {
  if (Array.isArray(value)) {
    return value.map((item) => hydrateProductNodes(item, productsById));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (value.type === "product" && value.attrs?.productId != null) {
    const product = productsById.get(Number(value.attrs.productId));

    if (product) {
      return {
        ...value,
        attrs: {
          productId: product.product_id,
          name: product.product_name1 || "Item sem nome",
          description: product.product_description1 || "",
          imageUrl: product.product_image_url || "",
          productType: product.product_type || "",
          price: product.product_price,
        },
      };
    }
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      hydrateProductNodes(entry, productsById),
    ])
  );
}

export default function Editor({ value, onChange }) {
  const [selectedPos, setSelectedPos] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [draftProductIds, setDraftProductIds] = useState([]);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data || []);
      } catch (err) {
        console.error("Failed to load products", err);
      }
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/productCategories");

        if (!res.ok) {
          throw new Error("Failed to load categories");
        }

        const data = await res.json();
        setCategories(data || []);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }

    fetchCategories();
  }, []);

  async function resolveSelectedProducts(ids) {
    const normalizedIds = (ids || [])
      .map((id) => {
        const parsedId = Number(id);
        return Number.isNaN(parsedId) ? null : parsedId;
      })
      .filter(Boolean);

    if (normalizedIds.length === 0) {
      return [];
    }

    try {
      const resolvedProducts = await Promise.all(
        normalizedIds.map(async (id) => {
          const res = await fetch(`/api/products/${id}`);
          if (!res.ok) return null;
          return res.json();
        })
      );

      return resolvedProducts.filter(Boolean);
    } catch (err) {
      console.error("Failed to load selected products", err);
      return [];
    }
  }

  function toggleCategory(categoryId) {
  setSelectedCategoryIds((current) => {
    const id = Number(categoryId);

    return current.includes(id)
      ? current.filter((currentId) => currentId !== id)
      : [...current, id];
  });
}

function clearCategoryFilters() {
  setSelectedCategoryIds([]);
}

  const initialEditorContent =
    value && typeof value === "object" && value.editor
      ? value.editor
      : value || "<p></p>";

  const editor = useEditor({
    editorProps: {
      handleClick(view, event) {
        const target = event.target;

        if (!(target instanceof HTMLElement)) return false;

        const img = target.closest("img");
        if (!img) {
          setSelectedPos(null);
          return false;
        }

        const pos = view.posAtDOM(img, 0);
        if (pos == null || pos < 0) return false;

        const node = view.state.doc.nodeAt(pos);
        if (!node || node.type.name !== "image") return false;

        const coords = view.coordsAtPos(pos);

        setSelectedPos(pos);
        setToolbarPos({
          top: coords.top + 30,
          left: coords.left,
        });

        return true;
      },
    },

    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      BulletList,
      OrderedList,
      ListItem,
      ImageWithDelete,
      ProductNode,
      Placeholder.configure({
        placeholder: "Escreve o conteúdo aqui...",
      }),
    ],

    // 👉 Só define conteúdo inicial
    content: initialEditorContent,

    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      const editorProductIds = editor.state.doc.content.content
        .filter((node) => node.type.name === "product")
        .map((node) => node.attrs.productId);

      setSelectedProductIds(editorProductIds);
      onChange?.({
        editor: editor.getJSON(),
        selectedProducts: editorProductIds,
      });
    },
  });

  useEffect(() => {
    if (!editor) return;

    const rawValue = value;
    const contentValue =
      rawValue && typeof rawValue === "object" && rawValue.editor
        ? rawValue.editor
        : rawValue || "<p></p>";

    const currentContentString =
      typeof contentValue === "string"
        ? editor.getHTML()
        : JSON.stringify(editor.getJSON());
    const nextContentString =
      typeof contentValue === "string" ? contentValue : JSON.stringify(contentValue);

    if (nextContentString !== currentContentString) {
      editor.commands.setContent(contentValue, false);
    }

    const productIds = collectProductIds(contentValue);
    setSelectedProductIds(productIds);

    if (productIds.length === 0 || !hasIncompleteProductNode(contentValue)) {
      return;
    }

    let cancelled = false;

    resolveSelectedProducts(productIds).then((resolvedProducts) => {
      if (cancelled || resolvedProducts.length === 0) return;

      const productsById = new Map(
        resolvedProducts.map((product) => [Number(product.product_id), product])
      );

      const currentContent = editor.getJSON();
      editor.commands.setContent(
        hydrateProductNodes(currentContent, productsById),
        false
      );
    });

    return () => {
      cancelled = true;
    };
  }, [editor, value]);

  useEffect(() => {
    if (!productModalOpen) return;
    setDraftProductIds(selectedProductIds);
  }, [productModalOpen, selectedProductIds]);
  // removed effect that emitted onChange on selectedProducts changes to avoid cycles

  if (!editor) {
    return (
      <div className="h-[70vh] flex items-center justify-center text-gray-400 border rounded-lg">
        A carregar editor...
      </div>
    );
  }

  function removeImage() {
    if (selectedPos == null) return;

    const node = editor.state.doc.nodeAt(selectedPos);
    if (!node) return;

    editor
      .chain()
      .focus()
      .deleteRange({
        from: selectedPos,
        to: selectedPos + node.nodeSize,
      })
      .run();

    setSelectedPos(null);
  }

  function toggleProductSelection(productId) {
    setDraftProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  function getEditorProductIds() {
    return editor.state.doc.content.content
      .filter((node) => node.type.name === "product")
      .map((node) => node.attrs.productId);
  }

  function addSelectedProducts() {
    const editorProductIds = getEditorProductIds();
    const newProductIds = draftProductIds.filter((productId) =>
      !editorProductIds.includes(productId)
    );

    if (newProductIds.length === 0) {
      setDraftProductIds([]);
      setProductModalOpen(false);
      return;
    }

    const productsToInsert = newProductIds
      .map((productId) => products.find((product) => product.product_id === productId))
      .filter(Boolean);

    editor
      .chain()
      .focus()
      .insertContentAt(
        editor.state.doc.content.size,
        productsToInsert.map((product) => ({
          type: "product",
          attrs: {
            productId: product.product_id,
            name: product.product_name1 || "Item sem nome",
            description: product.product_description1 || "",
            imageUrl: product.product_image_url || "",
            productType: product.product_type || "",
            price: product.product_price,
          },
        }))
      )
      .run();

    const nextProductIds = [...editorProductIds, ...newProductIds];
    setSelectedProductIds(nextProductIds);

    setDraftProductIds([]);
    setProductModalOpen(false);
  }

  const filteredProducts = products.filter((product) => {
    const productName = String(product.product_name1 || "").toLowerCase();
    const search = productSearch.trim().toLowerCase();

    // Pesquisa por nome
    const matchesSearch =
      search === "" || productName.includes(search);

    // Categorias
    const matchesCategory =
      selectedCategoryIds.length === 0 ||
      selectedCategoryIds.some(
        (categoryId) =>
          Number(categoryId) === Number(product.product_cat_id)
      );

    return matchesSearch && matchesCategory;
  });

  const hasNewDraftProducts = draftProductIds.some((id) => !selectedProductIds.includes(id));

  return (
    <div className="relative border rounded-xl bg-white shadow-sm flex flex-col h-full overflow-hidden">
      {/* TOOLBAR */}
      <div className="sticky top-0 z-50 flex flex-wrap gap-2 p-2 border-b bg-gray-50 shadow-sm">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="px-3 py-1 border rounded hover:bg-gray-200"
        >
          B
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="px-3 py-1 border rounded hover:bg-gray-200"
        >
          I
        </button>

        {/*<button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className="px-3 py-1 border rounded hover:bg-gray-200"
        >
          H2
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="px-3 py-1 border rounded hover:bg-gray-200"
        >
          • List
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="px-3 py-1 border rounded hover:bg-gray-200"
        >
          1. List
        </button>*/}

        {/* UPLOAD */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="image-upload"
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });

            const data = await res.json();

            if (data.url) {
              editor.chain().focus().setImage({ src: data.url }).run();
            }
          }}
        />

        <label
          htmlFor="image-upload"
          className="px-3 py-1 border-2 border-red-500 bg-red-50 text-red-600 font-semibold rounded hover:bg-red-100 cursor-pointer"
        >
          🖼 Upload
        </label>

        <button
          type="button"
          onClick={() => setProductModalOpen(true)}
          className="px-3 py-1 border-2 border-blue-500 bg-blue-50 text-blue-600 font-semibold rounded hover:bg-blue-100"
        >
          🛒 Adicionar Itens
        </button>
      </div>

      {/* EDITOR */}
      <div className="flex flex-col gap-4 px-4 py-3 overflow-y-auto flex-1">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* FLOATING TOOLBAR */}
      {selectedPos !== null && (
        <div
          className="absolute z-50 flex gap-2 bg-white border shadow-lg rounded-lg px-2 py-1"
          style={{
            top: toolbarPos.top,
            left: toolbarPos.left,
          }}
        >
          <button
            onClick={removeImage}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            🗑 Eliminar
          </button>

          <button
            onClick={() => setSelectedPos(null)}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Fechar
          </button>
        </div>
      )}


{productModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl min-h-[600px]">

      {/* HEADER */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Selecionar Itens
          </h2>

          <p className="text-sm text-gray-500">
            Escolha um ou mais itens para adicionar como cartões.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCategoryDropdownOpen(false);
            setProductModalOpen(false);
          }}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Fechar
        </button>
      </div>

      {/* CONTENT */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">

        {/* PESQUISA + FILTRO */}
        <div className="mb-5 flex flex-col gap-3">

          {/* SEARCHBAR + FILTRO */}
          <div className="flex items-center gap-2">

            {/* SEARCHBAR */}
            <div className="relative flex-1">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Pesquisar produto..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pl-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* BOTÃO FILTRO */}
            <div className="relative">

              <button
                type="button"
                onClick={() =>
                  setCategoryDropdownOpen((current) => !current)
                }
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                  selectedCategoryIds.length > 0
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                }`}
                title="Filtrar por categoria"
              >
                {/* ÍCONE FILTRO */}
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h18M6 12h12M10 19h4"
                  />
                </svg>

                {/* CONTADOR */}
                {selectedCategoryIds.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {selectedCategoryIds.length}
                  </span>
                )}
              </button>

              {/* DROPDOWN CATEGORIAS */}
              {categoryDropdownOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">

                  {/* HEADER DROPDOWN */}
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <span className="text-sm font-semibold text-gray-800">
                      Categorias
                    </span>

                    {selectedCategoryIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearCategoryFilters}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* LISTA DE CATEGORIAS */}
                  <div className="max-h-64 overflow-y-auto p-2">

                    {categories.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">
                        A carregar...
                      </p>
                    ) : (
                      categories.map((category, index) => {
                        const categoryId = Number(
                          category.product_cat_id
                        );

                        const isSelected =
                          selectedCategoryIds.includes(categoryId);

                        return (
                          <label
                            key={`${category.product_cat_id}-${index}`}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                              isSelected
                                ? "bg-blue-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleCategory(categoryId)
                              }
                              className="h-4 w-4 rounded accent-blue-600"
                            />

                            <span
                              className={`text-sm ${
                                isSelected
                                  ? "font-medium text-blue-700"
                                  : "text-gray-700"
                              }`}
                            >
                              {category.category_name1 ||
                                "Sem categoria"}
                            </span>
                          </label>
                        );
                      })
                    )}

                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FILTROS ATIVOS */}
          {(productSearch || selectedCategoryIds.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">

              {/* PESQUISA ATIVA */}
              {productSearch && (
                <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  <span>
                    Pesquisa: <strong>{productSearch}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => setProductSearch("")}
                    className="ml-1 text-gray-500 hover:text-gray-900"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* CATEGORIAS ATIVAS */}
              {selectedCategoryIds.map((categoryId) => {
                const category = categories.find(
                  (item) =>
                    Number(item.product_cat_id) ===
                    Number(categoryId)
                );

                if (!category) return null;

                return (
                  <div
                    key={categoryId}
                    className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                  >
                    <span>
                      {category.category_name1}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        toggleCategory(categoryId)
                      }
                      className="ml-1 font-bold text-blue-500 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PRODUTOS */}
        {products.length === 0 ? (
          <p className="text-sm text-gray-500">
            A carregar itens...
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-gray-500">
            Não existem itens que correspondam aos filtros.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredProducts.map((product) => {
              const isSelected = draftProductIds.includes(
                product.product_id
              );

              return (
                <label
                  key={product.product_id}
                  className={`flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {product.product_name1 ||
                          "Item sem nome"}
                      </p>

                      <p className="text-xs text-gray-500">
                        {Number(
                          product.product_price || 0
                        ).toFixed(2)}
                        €
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        toggleProductSelection(
                          product.product_id
                        )
                      }
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />

                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">

        <button
          type="button"
          onClick={() => {
            setCategoryDropdownOpen(false);
            setProductModalOpen(false);
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={!hasNewDraftProducts}
          onClick={addSelectedProducts}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
            !hasNewDraftProducts
              ? "cursor-not-allowed bg-gray-300"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Adicionar Itens
        </button>

      </div>
    </div>
  </div>
)}

    </div>
  );
}