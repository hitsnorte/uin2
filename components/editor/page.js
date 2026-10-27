"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import ItemModal from "@/components/items/ItemModal";
import ImageWithDelete from "./ImageWithDelete/page";
import ProductNode from "./ProductNode";
import "./editor.css";

function collectProductIds(value, ids = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectProductIds(item, ids));
  } else if (value && typeof value === "object") {
    if (value.type === "product" && value.attrs?.productId != null) {
      ids.push(Number(value.attrs.sourceItemId ?? value.attrs.productId));
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
    return !value.attrs?.name || value.attrs?.sourceItemId == null;
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
    const product = productsById.get(
      Number(value.attrs.sourceItemId ?? value.attrs.productId)
    );

    if (product) {
      return {
        ...value,
        attrs: {
          productId: product.outlet_item_id,
          sourceItemId: product.item_id,
          name: product.item_name1 || "Item sem nome",
          description: product.item_description1 || "",
          imageUrl: product.item_image_url || "",
          productType: product.item_type || "",
          price: product.item_price,
          order: product.order,
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

function buildItemTree(groups, families, categories, products) {
  const tree = groups.map((group) => ({
    key: `group-${group.item_group_id}`,
    type: "group",
    id: Number(group.item_group_id),
    name: group.item_group_name || "Grupo sem nome",
    children: [],
  }));
  const groupsById = new Map(
    tree.map((node) => [node.id, node])
  );
  let unassignedGroup = null;
  let unassignedFamily = null;
  let unassignedSubfamily = null;

  function getUnassignedGroup() {
    if (!unassignedGroup) {
      unassignedGroup = {
        key: "group-unassigned",
        type: "group",
        name: "Sem grupo",
        children: [],
      };
      tree.push(unassignedGroup);
    }

    return unassignedGroup;
  }

  function getUnassignedFamily() {
    if (!unassignedFamily) {
      unassignedFamily = {
        key: "family-unassigned",
        type: "family",
        name: "Sem família",
        children: [],
      };
      getUnassignedGroup().children.push(unassignedFamily);
    }

    return unassignedFamily;
  }

  function getUnassignedSubfamily() {
    if (!unassignedSubfamily) {
      unassignedSubfamily = {
        key: "subfamily-unassigned",
        type: "subfamily",
        name: "Sem subfamília",
        children: [],
      };
      getUnassignedFamily().children.push(unassignedSubfamily);
    }

    return unassignedSubfamily;
  }

  const familiesById = new Map();
  families.forEach((family) => {
    const familyNode = {
      key: `family-${family.item_family_id}`,
      type: "family",
      id: Number(family.item_family_id),
      name: family.item_family_name || "Família sem nome",
      children: [],
    };
    const groupNode = groupsById.get(Number(family.item_group_id));
    (groupNode || getUnassignedGroup()).children.push(familyNode);
    familiesById.set(Number(family.item_family_id), familyNode);
  });

  const subfamiliesById = new Map();
  categories.forEach((category) => {
    const subfamilyNode = {
      key: `subfamily-${category.item_subfamily_id}`,
      type: "subfamily",
      id: Number(category.item_subfamily_id),
      name: category.category_name1 || "Subfamília sem nome",
      children: [],
    };
    const familyNode =
      familiesById.get(Number(category.item_family_id)) ||
      getUnassignedFamily();
    familyNode.children.push(subfamilyNode);
    subfamiliesById.set(Number(category.item_subfamily_id), subfamilyNode);
  });

  products.forEach((product) => {
    const subfamilyNode =
      subfamiliesById.get(Number(product.item_cat_id)) ||
      getUnassignedSubfamily();
    subfamilyNode.children.push({
      key: `item-${product.item_id}`,
      type: "item",
      id: Number(product.item_id),
      name: product.item_name1 || "Item sem nome",
      product,
      children: [],
    });
  });

  function finalizeNode(node) {
    node.children.sort((first, second) =>
      first.name.localeCompare(second.name, "pt")
    );
    node.productIds =
      node.type === "item"
        ? [Number(node.product.item_id)]
        : node.children.flatMap(finalizeNode);
    return node.productIds;
  }

  tree.sort((first, second) => first.name.localeCompare(second.name, "pt"));
  tree.forEach(finalizeNode);
  return tree;
}

function filterItemTree(node, filters) {
  const selectedId = filters[`${node.type}Id`];
  if (selectedId && node.type !== "item" && node.id !== Number(selectedId)) {
    return null;
  }

  if (node.type === "item") {
    const matchesSearch = node.name.toLowerCase().includes(filters.search);
    const matchesType =
      !filters.itemType || node.product.item_type === filters.itemType;
    return matchesSearch && matchesType ? node : null;
  }

  const children = node.children
    .map((child) => filterItemTree(child, filters))
    .filter(Boolean);

  if (children.length === 0) return null;

  return {
    ...node,
    children,
    productIds: children.flatMap((child) => child.productIds),
  };
}

function ItemTreeNode({
  node,
  depth,
  selectedIds,
  expandedNodeIds,
  forceExpanded,
  onToggleSelection,
  onToggleExpanded,
}) {
  const productIds = node.productIds;
  const selectedCount = productIds.filter((id) => selectedIds.has(id)).length;
  const isSelected = productIds.length > 0 && selectedCount === productIds.length;
  const isPartiallySelected = selectedCount > 0 && !isSelected;
  const isExpanded = forceExpanded || expandedNodeIds.has(node.key);
  const hasChildren = node.children.length > 0;

  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
    >
      <div
        className="flex min-h-10 items-center gap-2 rounded-lg pr-3 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpanded(node.key)}
            aria-label={`${isExpanded ? "Recolher" : "Expandir"} ${node.name}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-200"
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="h-7 w-7 shrink-0" />
        )}

        <input
          type="checkbox"
          checked={isSelected}
          disabled={productIds.length === 0}
          ref={(element) => {
            if (element) element.indeterminate = isPartiallySelected;
          }}
          onChange={() => onToggleSelection(productIds)}
          aria-label={`Selecionar ${node.name}`}
          className="h-4 w-4 shrink-0 accent-blue-600"
        />
        <button
          type="button"
          onClick={() =>
            hasChildren ? onToggleExpanded(node.key) : onToggleSelection(productIds)
          }
          className={`min-w-0 flex-1 truncate text-left text-sm ${
            node.type === "item"
              ? "text-gray-700"
              : "font-medium text-gray-800"
          }`}
        >
          {node.name}
        </button>
        {node.type !== "item" && (
          <span className="shrink-0 text-xs text-gray-400">
            {productIds.length}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul role="group">
          {node.children.map((child) => (
            <ItemTreeNode
              key={child.key}
              node={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              expandedNodeIds={expandedNodeIds}
              forceExpanded={forceExpanded}
              onToggleSelection={onToggleSelection}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Editor({ value, onChange, outletId }) {
  const [selectedPos, setSelectedPos] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [draftProductIds, setDraftProductIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [families, setFamilies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [selectedSubfamilyId, setSelectedSubfamilyId] = useState("");
  const [selectedItemType, setSelectedItemType] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());
  const [itemTreeLoading, setItemTreeLoading] = useState(true);
  const [itemTreeError, setItemTreeError] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productEditError, setProductEditError] = useState("");
  const [isLoadingProductEdit, setIsLoadingProductEdit] = useState(false);

  useEffect(() => {
    async function fetchItemTreeData() {
      try {
        const endpoints = [
          "/api/productGroups",
          "/api/productFamilies",
          "/api/productCategories",
          "/api/products",
        ];
        const responses = await Promise.all(
          endpoints.map(async (endpoint) => {
            const response = await fetch(endpoint);
            if (!response.ok) {
              throw new Error(
                `Falha ao carregar ${endpoint} (${response.status})`
              );
            }
            return response.json();
          })
        );

        if (responses.some((data) => !Array.isArray(data))) {
          throw new Error("Os dados da estrutura de itens são inválidos.");
        }

        const [loadedGroups, loadedFamilies, loadedCategories, loadedProducts] =
          responses;
        setGroups(loadedGroups);
        setFamilies(loadedFamilies);
        setCategories(loadedCategories);
        setProducts(loadedProducts);
        setItemTreeError("");
      } catch (err) {
        console.error("Failed to load item structure", err);
        setItemTreeError("Não foi possível carregar a estrutura de itens.");
      } finally {
        setItemTreeLoading(false);
      }
    }

    fetchItemTreeData();
  }, []);

  const ensureOutletItem = useCallback(async (itemId) => {
    const normalizedOutletId = Number(outletId);
    if (!Number.isSafeInteger(normalizedOutletId) || normalizedOutletId <= 0) {
      throw new Error("É necessário associar o conteúdo a um outlet.");
    }

    const response = await fetch("/api/outlet-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outlet_id: normalizedOutletId,
        item_id: Number(itemId),
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || "Não foi possível guardar o item no outlet.");
    }
    return result;
  }, [outletId]);

  useEffect(() => {
    if (editingProductId === null) return;

    let cancelled = false;
    setEditingProduct(null);
    setProductEditError("");
    setIsLoadingProductEdit(true);

    async function fetchProduct() {
      try {
        const response = await fetch(`/api/outlet-items/${editingProductId}`);
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || "Não foi possível carregar o produto.");
        }
        if (!result || Number(result.outlet_item_id) !== editingProductId) {
          throw new Error("Os dados do produto são inválidos.");
        }
        if (!cancelled) setEditingProduct(result);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setProductEditError(
            error.message || "Não foi possível carregar o produto."
          );
        }
      } finally {
        if (!cancelled) setIsLoadingProductEdit(false);
      }
    }

    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [editingProductId]);

  const resolveSelectedProducts = useCallback(async (ids) => {
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
          if (!res.ok) {
            throw new Error(`Não foi possível carregar o item ${id}.`);
          }
          const item = await res.json();
          return ensureOutletItem(item.item_id);
        })
      );

      return resolvedProducts;
    } catch (err) {
      console.error("Failed to load selected products", err);
      return [];
    }
  }, [ensureOutletItem]);

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
      ProductNode.configure({
        onProductEdit: (productId, sourceItemId) =>
          openProductForEdit(productId, sourceItemId),
      }),
      Placeholder.configure({
        placeholder: "Escreve o conteúdo aqui...",
      }),
    ],

    // 👉 Só define conteúdo inicial
    content: initialEditorContent,

    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      const productNodes = editor.state.doc.content.content.filter(
        (node) => node.type.name === "product"
      );
      const editorProductIds = productNodes.map(
        (node) => node.attrs.sourceItemId ?? node.attrs.productId
      );

      setSelectedProductIds(editorProductIds);
      onChange?.({
        editor: editor.getJSON(),
        selectedProducts: productNodes.map((node) => node.attrs.productId),
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
        resolvedProducts.map((product) => [Number(product.item_id), product])
      );

      const currentContent = editor.getJSON();
      const hydratedContent = hydrateProductNodes(
        currentContent,
        productsById
      );
      editor.commands.setContent(hydratedContent, false);
      const updatedContent = editor.getJSON();
      const hydratedProductNodes = (updatedContent.content || []).filter(
        (node) => node.type === "product"
      );
      onChange?.({
        editor: updatedContent,
        selectedProducts: hydratedProductNodes.map(
          (node) => node.attrs.productId
        ),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [editor, onChange, resolveSelectedProducts, value]);

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

  async function openProductForEdit(productId, sourceItemId) {
    try {
      let outletItemId = Number(productId);
      if (sourceItemId == null) {
        const snapshot = await ensureOutletItem(productId);
        outletItemId = Number(snapshot.outlet_item_id);

        const transaction = editor.state.tr;
        editor.state.doc.descendants((node, position) => {
          if (
            node.type.name === "product" &&
            Number(node.attrs.productId) === Number(productId) &&
            node.attrs.sourceItemId == null
          ) {
            transaction.setNodeMarkup(position, undefined, {
              ...node.attrs,
              productId: snapshot.outlet_item_id,
              sourceItemId: snapshot.item_id,
            });
          }
        });
        if (transaction.docChanged) editor.view.dispatch(transaction);
      }

      setEditingProductId(outletItemId);
    } catch (error) {
      console.error(error);
      window.alert(error.message || "Não foi possível abrir o item.");
    }
  }

  async function saveEditedProduct(item) {
    const response = await fetch(
      `/api/outlet-items/${editingProduct.outlet_item_id}`,
      {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_name1: item.item_name1,
        item_description1: item.item_description1,
        item_price: item.item_price,
        item_vat: item.item_vat,
        takeaway_order: item.takeaway_order,
        cart: item.cart,
        order: item.order,
        checkin: item.checkin,
      }),
      }
    );
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || "Não foi possível guardar o produto.");
    }

    const transaction = editor.state.tr;
    editor.state.doc.descendants((node, position) => {
      if (
        node.type.name !== "product" ||
        Number(node.attrs.productId) !== Number(result.outlet_item_id)
      ) {
        return;
      }

      transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        productId: result.outlet_item_id,
        sourceItemId: result.item_id,
        name: result.item_name1 || "Item sem nome",
        description: result.item_description1 || "",
        imageUrl: result.item_image_url || "",
        productType: result.item_type || "",
        price: result.item_price,
        order: result.order,
        isConfigured: true,
      });
    });
    if (transaction.docChanged) editor.view.dispatch(transaction);

    setEditingProductId(null);
    setEditingProduct(null);
  }

  function toggleNodeSelection(productIds) {
    setDraftProductIds((current) => {
      const currentIds = new Set(current.map(Number));
      const shouldDeselect = productIds.every((id) => currentIds.has(id));

      productIds.forEach((id) => {
        if (shouldDeselect) {
          currentIds.delete(id);
        } else {
          currentIds.add(id);
        }
      });

      return [...currentIds];
    });
  }

  function toggleNodeExpanded(nodeId) {
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  function getEditorProductIds() {
    return editor.state.doc.content.content
      .filter((node) => node.type.name === "product")
      .map((node) => node.attrs.sourceItemId ?? node.attrs.productId);
  }

  async function addSelectedProducts() {
    const editorProductIds = getEditorProductIds();
    const editorProductIdSet = new Set(editorProductIds.map(Number));
    const newProductIds = draftProductIds.filter((productId) =>
      !editorProductIdSet.has(Number(productId))
    );

    if (newProductIds.length === 0) {
      setDraftProductIds([]);
      setProductModalOpen(false);
      return;
    }

    let productsToInsert;
    try {
      productsToInsert = await Promise.all(
        newProductIds
          .map((productId) =>
            products.find(
              (product) => Number(product.item_id) === Number(productId)
            )
          )
          .filter(Boolean)
          .map((product) => ensureOutletItem(product.item_id))
      );
    } catch (error) {
      console.error(error);
      alert(error.message || "Não foi possível adicionar os itens.");
      return;
    }

    editor
      .chain()
      .focus()
      .insertContentAt(
        editor.state.doc.content.size,
        productsToInsert.map((product) => ({
          type: "product",
          attrs: {
            productId: product.outlet_item_id,
            sourceItemId: product.item_id,
            name: product.item_name1 || "Item sem nome",
            description: product.item_description1 || "",
            imageUrl: product.item_image_url || "",
            productType: product.item_type || "",
            price: product.item_price,
            order: product.order,
            isConfigured: false,
          },
        }))
      )
      .run();

    const nextProductIds = [...editorProductIds, ...newProductIds];
    setSelectedProductIds(nextProductIds);

    setDraftProductIds([]);
    setProductModalOpen(false);
  }

  const itemTree = buildItemTree(groups, families, categories, products);
  const normalizedSearch = productSearch.trim().toLowerCase();
  const treeFilters = {
    search: normalizedSearch,
    groupId: selectedGroupId,
    familyId: selectedFamilyId,
    subfamilyId: selectedSubfamilyId,
    itemType: selectedItemType,
  };
  const visibleItemTree = normalizedSearch
    || selectedGroupId
    || selectedFamilyId
    || selectedSubfamilyId
    || selectedItemType
    ? itemTree.map((node) => filterItemTree(node, treeFilters)).filter(Boolean)
    : itemTree;
  const availableFamilies = selectedGroupId
    ? families.filter(
        (family) => Number(family.item_group_id) === Number(selectedGroupId)
      )
    : families;
  const availableSubfamilies = selectedFamilyId
    ? categories.filter(
        (category) =>
          Number(category.item_family_id) === Number(selectedFamilyId)
      )
    : selectedGroupId
      ? categories.filter((category) =>
          availableFamilies.some(
            (family) =>
              Number(family.item_family_id) ===
              Number(category.item_family_id)
          )
        )
      : categories;
  const availableItemTypes = [
    ...new Set(products.map((product) => product.item_type).filter(Boolean)),
  ].sort((first, second) => first.localeCompare(second, "pt"));
  const hasActiveFilters = Boolean(
    selectedGroupId ||
      selectedFamilyId ||
      selectedSubfamilyId ||
      selectedItemType
  );
  const clearItemFilters = () => {
    setSelectedGroupId("");
    setSelectedFamilyId("");
    setSelectedSubfamilyId("");
    setSelectedItemType("");
  };
  const draftProductIdSet = new Set(draftProductIds.map(Number));

  const hasNewDraftProducts = draftProductIds.some(
    (id) => !selectedProductIds.map(Number).includes(Number(id))
  );

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
    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Selecionar Itens</h2>
          <p className="text-sm text-gray-500">
            Selecione itens individuais ou um grupo, família ou subfamília completa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setProductModalOpen(false)}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Fechar
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
        <div className="relative flex shrink-0 gap-2">
          <input
            type="search"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Pesquisar itens..."
            aria-label="Pesquisar itens"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            aria-label="Abrir filtros"
            className={`relative flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
              hasActiveFilters
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h18M6 12h12m-8 7h4"
              />
            </svg>
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {
                  [
                    selectedGroupId,
                    selectedFamilyId,
                    selectedSubfamilyId,
                    selectedItemType,
                  ].filter(Boolean).length
                }
              </span>
            )}

          </button>

          {filtersOpen && (
            <div
              role="dialog"
              aria-label="Filtros de itens"
              className="absolute right-0 top-full z-30 mt-2 w-full rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={selectedGroupId}
              onChange={(event) => {
                setSelectedGroupId(event.target.value);
                setSelectedFamilyId("");
                setSelectedSubfamilyId("");
              }}
              aria-label="Filtrar por grupo"
              className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos os grupos</option>
              {groups.map((group) => (
                <option key={group.item_group_id} value={group.item_group_id}>
                  {group.item_group_name || "Grupo sem nome"}
                </option>
              ))}
            </select>

            <select
              value={selectedFamilyId}
              onChange={(event) => {
                setSelectedFamilyId(event.target.value);
                setSelectedSubfamilyId("");
              }}
              aria-label="Filtrar por família"
              disabled={availableFamilies.length === 0}
              className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">Todas as famílias</option>
              {availableFamilies.map((family) => (
                <option key={family.item_family_id} value={family.item_family_id}>
                  {family.item_family_name || "Família sem nome"}
                </option>
              ))}
            </select>

            <select
              value={selectedSubfamilyId}
              onChange={(event) => setSelectedSubfamilyId(event.target.value)}
              aria-label="Filtrar por subfamília"
              disabled={availableSubfamilies.length === 0}
              className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">Todas as subfamílias</option>
              {availableSubfamilies.map((category) => (
                <option
                  key={category.item_subfamily_id}
                  value={category.item_subfamily_id}
                >
                  {category.category_name1 || "Subfamília sem nome"}
                </option>
              ))}
            </select>

            <select
              value={selectedItemType}
              onChange={(event) => setSelectedItemType(event.target.value)}
              aria-label="Filtrar por tipo de item"
              className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos os tipos</option>
              {availableItemTypes.map((itemType) => (
                <option key={itemType} value={itemType}>
                  {itemType}
                </option>
              ))}
            </select>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={clearItemFilters}
                  disabled={!hasActiveFilters}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
          {itemTreeLoading ? (
            <p className="px-3 py-4 text-sm text-gray-500">A carregar estrutura de itens...</p>
          ) : itemTreeError ? (
            <p role="alert" className="px-3 py-4 text-sm text-red-600">{itemTreeError}</p>
          ) : visibleItemTree.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500">
              {normalizedSearch || hasActiveFilters
                ? "Não foram encontrados itens com estes filtros."
                : "Não existem itens para selecionar."}
            </p>
          ) : (
            <ul role="tree" aria-label="Estrutura de itens" className="space-y-0.5">
              {visibleItemTree.map((node) => (
                <ItemTreeNode
                  key={node.key}
                  node={node}
                  depth={0}
                  selectedIds={draftProductIdSet}
                  expandedNodeIds={expandedNodeIds}
                  forceExpanded={Boolean(normalizedSearch || hasActiveFilters)}
                  onToggleSelection={toggleNodeSelection}
                  onToggleExpanded={toggleNodeExpanded}
                />
              ))}
            </ul>
          )}
        </div>

        <p className="shrink-0 text-sm text-gray-500">
          {draftProductIds.length} item(ns) selecionado(s)
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <button
          type="button"
          onClick={() => setProductModalOpen(false)}
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
      {editingProductId !== null && (
        editingProduct ? (
          <ItemModal
            item={editingProduct}
            onClose={() => {
              setEditingProductId(null);
              setEditingProduct(null);
              setProductEditError("");
            }}
            onSaved={saveEditedProduct}
          />
        ) : (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              {isLoadingProductEdit ? (
                <p role="status" className="text-sm text-gray-600">
                  A carregar produto...
                </p>
              ) : (
                <>
                  <p role="alert" className="text-sm text-red-600">
                    {productEditError || "Não foi possível carregar o produto."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProductId(null);
                      setProductEditError("");
                    }}
                    className="mt-4 rounded-lg bg-gray-200 px-4 py-2"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}