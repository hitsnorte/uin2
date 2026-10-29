"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import {
  FiAlignJustify,
  FiAlignCenter,
  FiAlignLeft,
  FiAlignRight,
  FiEye,
} from "react-icons/fi";
import ItemModal from "@/components/items/ItemModal";
import ImageWithDelete, {
  TextAlign,
  Underline,
} from "./ImageWithDelete/page";
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

export default function Editor({
  value,
  onChange,
  outletId,
  previewTitle = "Conteúdo",
  previewItems = [],
}) {
  const [selectedPos, setSelectedPos] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageWidthDraft, setImageWidthDraft] = useState("");
  const [bannerUrl, setBannerUrl] = useState(
    value && typeof value === "object" ? value.banner_url || "" : ""
  );
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState("");
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
  const bannerUrlRef = useRef(bannerUrl);
  const bannerFileInputRef = useRef(null);

  useEffect(() => {
    const nextBannerUrl =
      value && typeof value === "object" ? value.banner_url || "" : "";
    bannerUrlRef.current = nextBannerUrl;
    setBannerUrl(nextBannerUrl);
  }, [value]);

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
      TextAlign,
      Underline,
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
        banner_url: bannerUrlRef.current,
      });
    },
  });

  useEffect(() => {
    const node =
      selectedPos === null ? null : editor?.state.doc.nodeAt(selectedPos);
    setImageWidthDraft(
      node?.type.name === "image" && node.attrs.width
        ? String(node.attrs.width)
        : ""
    );
  }, [editor, selectedPos]);

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
        banner_url: bannerUrlRef.current,
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

  function resizeSelectedImage(width) {
    if (selectedPos == null) return;

    const node = editor.state.doc.nodeAt(selectedPos);
    if (!node || node.type.name !== "image") return;

    const transaction = editor.state.tr.setNodeMarkup(selectedPos, undefined, {
      ...node.attrs,
      width: width || null,
    });
    editor.view.dispatch(transaction);
  }

  async function uploadBanner() {
    if (!bannerFile) return;

    setIsUploadingBanner(true);
    setBannerError("");

    try {
      const formData = new FormData();
      formData.append("file", bannerFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Não foi possível carregar o banner.");
      }

      bannerUrlRef.current = data.url;
      setBannerUrl(data.url);
      onChange?.({
        editor: editor.getJSON(),
        selectedProducts: editor.state.doc.content.content
          .filter((node) => node.type.name === "product")
          .map((node) => node.attrs.productId),
        banner_url: data.url,
      });
      setBannerFile(null);
      setBannerModalOpen(false);
    } catch (error) {
      console.error("Erro ao carregar banner:", error);
      setBannerError(error.message || "Não foi possível carregar o banner.");
    } finally {
      setIsUploadingBanner(false);
    }
  }

  function removeBanner() {
    bannerUrlRef.current = "";
    setBannerUrl("");
    setBannerFile(null);
    setBannerError("");
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = "";
    }

    onChange?.({
      editor: editor.getJSON(),
      selectedProducts: editor.state.doc.content.content
        .filter((node) => node.type.name === "product")
        .map((node) => node.attrs.productId),
      banner_url: "",
    });
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
  const selectedImage =
    selectedPos === null ? null : editor.state.doc.nodeAt(selectedPos);
  const editorHtml = editor.getHTML();

  return (
    <div className="content-editor relative flex h-full flex-col overflow-hidden bg-white">
      {/* TOOLBAR */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Negrito"
          aria-pressed={editor.isActive("bold")}
          className={`editor-toolbar-button font-bold ${editor.isActive("bold") ? "is-active" : ""}`}
        >
          B
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Itálico"
          aria-pressed={editor.isActive("italic")}
          className={`editor-toolbar-button italic ${editor.isActive("italic") ? "is-active" : ""}`}
        >
          I
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleMark("underline").run()}
          aria-label="Sublinhado"
          aria-pressed={editor.isActive("underline")}
          className={`editor-toolbar-button underline ${editor.isActive("underline") ? "is-active" : ""}`}
        >
          U
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          aria-label="Alinhar à esquerda"
          title="Alinhar à esquerda"
          className={`editor-toolbar-button ${editor.isActive("paragraph", { textAlign: "left" }) || editor.isActive("heading", { textAlign: "left" }) ? "is-active" : ""}`}
        >
          <FiAlignLeft aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          aria-label="Centrar texto"
          title="Centrar texto"
          className={`editor-toolbar-button ${editor.isActive("paragraph", { textAlign: "center" }) || editor.isActive("heading", { textAlign: "center" }) ? "is-active" : ""}`}
        >
          <FiAlignCenter aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          aria-label="Alinhar à direita"
          title="Alinhar à direita"
          className={`editor-toolbar-button ${editor.isActive("paragraph", { textAlign: "right" }) || editor.isActive("heading", { textAlign: "right" }) ? "is-active" : ""}`}
        >
          <FiAlignRight aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          aria-label="Justificar texto"
          title="Justificar texto"
          className={`editor-toolbar-button ${editor.isActive("paragraph", { textAlign: "justify" }) || editor.isActive("heading", { textAlign: "justify" }) ? "is-active" : ""}`}
        >
          <FiAlignJustify aria-hidden="true" />
        </button>

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
          className="editor-toolbar-action editor-toolbar-upload"
        >
          🖼 Upload
        </label>

        <button
          type="button"
          onClick={() => {
            setBannerError("");
            setBannerModalOpen(true);
          }}
          className="editor-toolbar-action editor-toolbar-banner"
        >
          {bannerUrl ? "Editar banner" : "Adicionar banner"}
        </button>

        <button
          type="button"
          onClick={() => setProductModalOpen(true)}
          className="editor-toolbar-action editor-toolbar-products"
        >
          🛒 Adicionar itens
        </button>

        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="editor-toolbar-preview ml-auto"
        >
          <FiEye aria-hidden="true" />
          Pré-visualizar
        </button>
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="content-preview-title"
        >
          <div className="flex h-[96vh] w-[98vw] max-w-[1800px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h2
                id="content-preview-title"
                className="text-lg font-semibold text-gray-900"
              >
                Pré-visualização
              </h2>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>

            <div className="content-preview-viewport min-h-0 flex-1 overflow-auto">
              <div className="content-preview-page">
                <header className="content-preview-toolbar">
                  <span className="content-preview-back" aria-hidden="true">
                    ‹
                  </span>
                  <span className="content-preview-page-title">
                    {previewTitle}
                  </span>
                  <span className="content-preview-menu" aria-hidden="true">
                    ☰
                  </span>
                </header>

                <div className="content-preview-layout">
                  <aside className="content-preview-sidebar">
                    <div className="content-preview-sidebar-heading">
                      <span className="content-preview-eyebrow">Navegação</span>
                      <strong>{previewTitle}</strong>
                    </div>
                    <nav aria-label="Pré-visualização da navegação">
                      {previewItems.length ? (
                        previewItems.map((item, index) => (
                          <div
                            key={`${item.id ?? item.name}-${index}`}
                            className={`content-preview-nav-item${item.active ? " is-active" : ""}${item.nested ? " is-nested" : ""}`}
                          >
                            {item.name}
                          </div>
                        ))
                      ) : (
                        <div className="content-preview-nav-item is-active">
                          {previewTitle}
                        </div>
                      )}
                    </nav>
                  </aside>

                  <main className="content-preview-main">
                    {bannerUrl && (
                      <div
                        className="content-preview-banner"
                        role="img"
                        aria-label="Banner"
                        style={{ backgroundImage: `url("${bannerUrl}")` }}
                      />
                    )}
                    <section className="content-preview-container">
                      <div
                        className="content-preview-body ProseMirror"
                        dangerouslySetInnerHTML={{ __html: editorHtml }}
                      />
                    </section>
                  </main>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {bannerModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="banner-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="banner-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                Imagem de banner
              </h2>
              <button
                type="button"
                onClick={() => {
                  setBannerFile(null);
                  setBannerModalOpen(false);
                }}
                className="rounded-lg px-3 py-1 text-gray-600 hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>

            {bannerUrl && !bannerFile && (
              <div
                role="img"
                aria-label="Banner atual"
                className="mb-4 h-48 w-full rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url("${bannerUrl}")` }}
              />
            )}

            <label
              htmlFor="banner-image-upload"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Selecionar imagem
            </label>
            <input
              ref={bannerFileInputRef}
              id="banner-image-upload"
              type="file"
              accept="image/*"
              onChange={(event) => {
                setBannerFile(event.target.files?.[0] || null);
                setBannerError("");
              }}
              className="block w-full text-sm text-gray-700"
            />
            <p className="mt-2 text-sm text-gray-500">
              Tamanho recomendado: 1600 × 400 px (proporção 4:1). A imagem
              adapta-se ao espaço do banner e pode ser recortada nas laterais
              em ecrãs mais estreitos; mantenha o elemento principal ao centro.
            </p>
            {bannerError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {bannerError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {bannerUrl && (
                <button
                  type="button"
                  onClick={removeBanner}
                  className="mr-auto rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                >
                  Remover banner
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setBannerFile(null);
                  setBannerModalOpen(false);
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={uploadBanner}
                disabled={!bannerFile || isUploadingBanner}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isUploadingBanner ? "A carregar..." : "Carregar banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="content-editor-surface" />
      </div>

      {/* FLOATING TOOLBAR */}
      {selectedImage?.type.name === "image" && (
        <div
          className="absolute z-50 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-lg"
          style={{
            top: toolbarPos.top,
            left: toolbarPos.left,
          }}
        >
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Largura
            <input
              type="number"
              min="50"
              max="2000"
              step="10"
              value={imageWidthDraft}
              placeholder="Auto"
              onChange={(event) => setImageWidthDraft(event.target.value)}
              onBlur={() => {
                const width = Number(imageWidthDraft);
                if (!imageWidthDraft) {
                  resizeSelectedImage(null);
                } else if (
                  Number.isFinite(width) &&
                  width >= 50 &&
                  width <= 2000
                ) {
                  resizeSelectedImage(width);
                } else {
                  setImageWidthDraft(
                    selectedImage?.attrs.width
                      ? String(selectedImage.attrs.width)
                      : ""
                  );
                }
              }}
              aria-label="Largura da imagem em píxeis"
              className="w-20 rounded border border-gray-300 px-2 py-1"
            />
            px
          </label>
          <button
            type="button"
            onClick={() => {
              setImageWidthDraft("");
              resizeSelectedImage(null);
            }}
            className="rounded bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200"
          >
            Largura automática
          </button>
          <button
            type="button"
            onClick={removeImage}
            className="rounded bg-red-500 px-2 py-1 text-sm text-white hover:bg-red-600"
          >
            🗑 Eliminar
          </button>

          <button
            type="button"
            onClick={() => setSelectedPos(null)}
            className="rounded bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200"
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