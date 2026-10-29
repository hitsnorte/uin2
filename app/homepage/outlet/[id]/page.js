"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FiArrowLeft, FiChevronDown, FiMenu } from "react-icons/fi";
import ProductNode from "../../../../components/editor/ProductNode";
import {
  ContentImage,
  TextAlign,
  Underline,
} from "../../../../components/editor/ImageWithDelete/page";

import "./content.css";
import "../../loading.css";

function isActive(value) {
  return value === true || value === 1 || value === "1";
}

function collectProductReferences(value, references = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectProductReferences(item, references));
  } else if (value && typeof value === "object") {
    if (value.type === "product" && value.attrs?.productId != null) {
      references.push({
        productId: Number(value.attrs.productId),
        sourceItemId:
          value.attrs.sourceItemId == null
            ? null
            : Number(value.attrs.sourceItemId),
      });
    }

    Object.values(value).forEach((item) =>
      collectProductReferences(item, references)
    );
  }

  return [
    ...new Map(
      references
        .filter((reference) => Number.isSafeInteger(reference.productId))
        .map((reference) => [
          `${reference.sourceItemId == null ? "item" : "outlet"}:${reference.productId}`,
          reference,
        ])
    ).values(),
  ];
}

function enrichProductNodes(value, productsById) {
  if (Array.isArray(value)) {
    return value.map((item) => enrichProductNodes(item, productsById));
  }

  if (!value || typeof value !== "object") return value;

  if (value.type === "product" && value.attrs?.productId) {
    const lookupKey = `${
      value.attrs.sourceItemId == null ? "item" : "outlet"
    }:${Number(value.attrs.productId)}`;
    const product = productsById.get(lookupKey);

    if (product) {
      return {
        ...value,
        attrs: {
          productId: value.attrs.productId,
          ...(product.outlet_item_id
            ? { sourceItemId: product.item_id }
            : value.attrs.sourceItemId == null
              ? {}
              : { sourceItemId: value.attrs.sourceItemId }),
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
      enrichProductNodes(entry, productsById),
    ])
  );
}

export default function OutletPage() {
  const params = useParams();
  const router = useRouter();
  const routeMatch = String(params.id || "").match(/^(menu|submenu)-(\d+)$/);
  const contentType = routeMatch?.[1] || null;
  const contentId = routeMatch ? Number(routeMatch[2]) : null;

  const [content, setContent] = useState(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const [contentItem, setContentItem] = useState(null);
  const [contentOutletId, setContentOutletId] = useState(null);
  const [contentError, setContentError] = useState("");
  const [personalize, setPersonalize] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [menus, setMenus] = useState([]);
  const [submenus, setSubmenus] = useState([]);
  const [selectedLang, setSelectedLang] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderSucceeded, setOrderSucceeded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [loading, setLoading] = useState(true);
  const sessionStateRef = useRef({ checking: true, authenticated: false });
  sessionStateRef.current = {
    checking: checkingSession,
    authenticated: isLoggedIn,
  };

  // ---------------- FETCH ----------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setContentError("");

    try {
      if (!contentType || !contentId) {
        throw new Error("O conteúdo solicitado é inválido.");
      }

      const contentUrl =
        contentType === "menu"
          ? `/api/menu-content?menu_id=${contentId}`
          : `/api/submenu-content?submenu_id=${contentId}`;

      const [contentResponse, pers, outletsData, menusData, submenusData] = await Promise.all([
        fetch(contentUrl),

        fetch("/api/personalize").then((r) => r.json()),

        fetch("/api/outlets").then((r) => r.json()),

        fetch("/api/menus").then((r) => r.json()),
        fetch("/api/submenus").then((r) => r.json()),
      ]);

      const contentData = await contentResponse.json();
      if (!contentResponse.ok) {
        throw new Error(contentData.error || "Erro ao carregar o conteúdo.");
      }

      if (
        !Array.isArray(outletsData) ||
        !Array.isArray(menusData) ||
        !Array.isArray(submenusData)
      ) {
        throw new TypeError("As APIs de outlets, menus e submenus devem devolver listas.");
      }

      const visibleMenus = menusData.filter((menu) => isActive(menu.visible));
      const visibleSubmenus = submenusData.filter((submenu) =>
        isActive(submenu.visible)
      );
      const itemList = contentType === "menu" ? visibleMenus : visibleSubmenus;
      const itemIdField = contentType === "menu" ? "menu_id" : "submenu_id";
      const item = itemList.find((entry) => Number(entry[itemIdField]) === contentId);
      if (!item) {
        throw new Error("O menu ou submenu solicitado não foi encontrado.");
      }

      const parentMenu =
        contentType === "submenu"
          ? visibleMenus.find(
              (menu) => Number(menu.menu_id) === Number(item.menu_id)
            )
          : item;
      if (!parentMenu || (contentType === "submenu" && !isActive(parentMenu.has_submenus))) {
        throw new Error("O submenu não pertence a um menu com submenus ativos.");
      }

      const productReferences = collectProductReferences(contentData.content);
      const products = await Promise.all(
        productReferences.map(async ({ productId, sourceItemId }) => {
          const endpoint =
            sourceItemId == null
              ? `/api/products/${productId}`
              : `/api/outlet-items/${productId}`;
          const response = await fetch(endpoint);
          return response.ok ? response.json() : null;
        })
      );

      const productsById = new Map(
        productReferences.flatMap((reference, index) =>
          products[index]
            ? [[
                `${reference.sourceItemId == null ? "item" : "outlet"}:${reference.productId}`,
                products[index],
              ]]
            : []
        )
      );
      setContent(enrichProductNodes(contentData.content || null, productsById));
      setBannerUrl(contentData.banner_url || "");
      setContentItem(item);
      setContentOutletId(parentMenu.outlet_id);
      setPersonalize(pers || null);
      setOutlets(outletsData.filter((outlet) => isActive(outlet.visible)));
      setMenus(visibleMenus);
      setSubmenus(visibleSubmenus);

      const savedLang = Number(localStorage.getItem("lang") || 1);
      setSelectedLang(savedLang);
    } catch (error) {
      console.error(error);
      setContentError(error.message || "Erro ao carregar o conteúdo.");
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const response = await fetch("/api/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setIsLoggedIn(false);
        return;
      }

      const data = await response.json();
      setIsLoggedIn(Boolean(data?.authenticated));
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      setIsLoggedIn(false);
    } finally {
      setCheckingSession(false);
    }
  }

  // ---------------- GET NAME ----------------

  function getName(item, field) {
    return (
      item?.[`${field}${selectedLang}`] ||
      item?.[`${field}1`] ||
      item?.[`${field}2`] ||
      item?.[`${field}3`] ||
      item?.[`${field}4`] ||
      item?.[`${field}5`] ||
      ""
    );
  }

  // ---------------- ACTIVE OUTLET ----------------

  const activeOutlet = outlets.find(
    (outlet) => Number(outlet.outlet_id) === Number(contentOutletId)
  );
  const outletMenus = menus.filter(
    (menu) => Number(menu.outlet_id) === Number(contentOutletId)
  );
  const activeMenuId =
    contentType === "submenu"
      ? contentItem?.menu_id
      : contentType === "menu" && isActive(contentItem?.has_submenus)
        ? contentItem?.menu_id
        : null;

  useEffect(() => {
    setExpandedMenuId(activeMenuId == null ? null : Number(activeMenuId));
  }, [activeMenuId]);

  function getMenuSubmenus(menuId) {
    return submenus.filter(
      (submenu) => Number(submenu.menu_id) === Number(menuId)
    );
  }

  // ---------------- TIPTAP ----------------

  const editor = useEditor({
    editable: false,

    extensions: [
      StarterKit,
      ContentImage,
      TextAlign,
      Underline,
      ProductNode.configure({
        onProductOrder: openOrderConfirmation,
      }),
    ],

    content: {
      type: "doc",
      content: [],
    },

    immediatelyRender: false,
  });

  async function openOrderConfirmation(productId, sourceItemId) {
    if (!productId) return;
    if (sessionStateRef.current.checking) return;
    if (!sessionStateRef.current.authenticated) {
      router.push("/homepage?opensigninmodal");
      return;
    }

    try {
      const endpoint =
        sourceItemId == null
          ? `/api/products/${productId}`
          : `/api/outlet-items/${productId}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Produto não encontrado");

      const product = await response.json();
      setSelectedProduct(product);
      setOrderMessage("");
      setOrderSucceeded(false);
    } catch (error) {
      console.error("Não foi possível carregar o item", error);
    }
  }

  async function orderProduct() {
    if (
      !selectedProduct ||
      !isLoggedIn ||
      ![true, 1, "1"].includes(selectedProduct.order) ||
      isOrdering
    ) {
      return;
    }

    setIsOrdering(true);
    setOrderMessage("");
    setOrderSucceeded(false);

    try {
      const response = await fetch("/api/product-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selectedProduct.outlet_item_id
            ? { outletItemId: selectedProduct.outlet_item_id }
            : { productId: selectedProduct.item_id }),
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          setSelectedProduct(null);
          router.push("/homepage?opensigninmodal");
          return;
        }
        throw new Error(result?.error || "Falha ao enviar pedido");
      }

      setOrderSucceeded(true);
      setOrderMessage("Pedido efetuado com sucesso.");
    } catch (error) {
      console.error("Não foi possível enviar o pedido", error);
      setOrderMessage(error.message || "Não foi possível enviar o pedido.");
    } finally {
      setIsOrdering(false);
    }
  }

  useEffect(() => {
    if (!editor || !content) return;

    const editorContent =
      typeof content === "object" && content.editor
        ? content.editor
        : content;

    editor.commands.setContent(editorContent);
  }, [editor, content]);

  // ---------------- LOADING ----------------

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        A carregar...
      </div>
    );
  }

  // ---------------- PAGE ----------------

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor:
          personalize?.background_color || "#f3f4f6",

        color:
          personalize?.foreground_color || "#111",
      }}
    >
      <div
        key={`${contentType}-${contentId}`}
        className="outlet-page page-transition-enter flex-1"
        style={{
          "--outlet-primary": personalize?.primary_color || "#ef4444",
          "--outlet-secondary": personalize?.secondary_color || "#d1d5db",
          "--outlet-foreground": personalize?.foreground_color || "#111827",
          "--outlet-surface": personalize?.background_color || "#ffffff",
        }}
      >
        <div className="outlet-toolbar flex items-center justify-between">
          <button
            type="button"
            className="outlet-back-button"
            onClick={() => router.push("/homepage")}
            aria-label="Voltar à homepage"
          >
            <FiArrowLeft aria-hidden="true" size={24} />
          </button>
          <button
            type="button"
            className="outlet-sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-controls="outlet-navigation"
            aria-label={sidebarOpen ? "Fechar navegação" : "Abrir navegação"}
          >
            <FiMenu aria-hidden="true" size={24} />
          </button>
        </div>
        <div className="outlet-layout">
          <aside className="outlet-sidebar" aria-label="Navegação do outlet">
            <div className="outlet-sidebar-heading">
              <div>
                <span className="outlet-sidebar-eyebrow">Explorar</span>
                <h2>{getName(activeOutlet, "outlet_name") || "Menus"}</h2>
              </div>
            </div>

            <div
              className={`outlet-sidebar-content${sidebarOpen ? " is-open" : ""}`}
              id="outlet-navigation"
            >
              {outletMenus.length > 0 ? (
                <nav className="outlet-navigation" aria-label="Menus e submenus">
                  {outletMenus.map((menu) => {
                    const menuId = Number(menu.menu_id);
                    const menuSubmenus = getMenuSubmenus(menuId);
                    const hasSubmenus = isActive(menu.has_submenus);
                    const isExpanded = expandedMenuId === menuId;
                    const isActiveMenu =
                      contentType === "menu" && Number(contentId) === menuId;

                    return (
                      <div className="outlet-navigation-group" key={menuId}>
                        {hasSubmenus ? (
                          <>
                            <button
                              type="button"
                              className={`outlet-navigation-item outlet-navigation-parent${isActiveMenu ? " is-active" : ""}`}
                              onClick={() =>
                                setExpandedMenuId(isExpanded ? null : menuId)
                              }
                              aria-expanded={isExpanded}
                            >
                              <span>{getName(menu, "menu_name") || "Menu"}</span>
                              <FiChevronDown
                                className={isExpanded ? "is-rotated" : ""}
                                aria-hidden="true"
                              />
                            </button>
                            {isExpanded && (
                              <div className="outlet-subnavigation">
                                {menuSubmenus.map((submenu) => {
                                  const isActive =
                                    contentType === "submenu" &&
                                    Number(contentId) === Number(submenu.submenu_id);

                                  return (
                                    <button
                                      type="button"
                                      key={submenu.submenu_id}
                                      className={`outlet-navigation-item outlet-navigation-subitem${isActive ? " is-active" : ""}`}
                                      onClick={() => {
                                        setSidebarOpen(false);
                                        router.push(
                                          `/homepage/outlet/submenu-${submenu.submenu_id}`
                                        );
                                      }}
                                      aria-current={isActive ? "page" : undefined}
                                    >
                                      {getName(submenu, "submenu_name") || "Submenu"}
                                    </button>
                                  );
                                })}
                                {menuSubmenus.length === 0 && (
                                  <p className="outlet-navigation-empty">
                                    Sem submenus disponíveis.
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            className={`outlet-navigation-item${isActiveMenu ? " is-active" : ""}`}
                            onClick={() => {
                              setSidebarOpen(false);
                              router.push(
                                `/homepage/outlet/menu-${menu.menu_id}`
                              );
                            }}
                            aria-current={isActiveMenu ? "page" : undefined}
                          >
                            {getName(menu, "menu_name") || "Menu"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </nav>
              ) : (
                <p className="outlet-navigation-empty">
                  Não existem menus associados a este outlet.
                </p>
              )}
            </div>
          </aside>

          <main className="outlet-main-column">
            {bannerUrl && (
              <section className="outlet-banner" aria-label="Banner">
                <div
                  className="outlet-banner-image"
                  role="img"
                  aria-label={`Banner de ${getName(activeOutlet, "outlet_name") || "outlet"}`}
                  style={{ backgroundImage: `url("${bannerUrl}")` }}
                />
              </section>
            )}
            <section className="outlet-content-container">
              <div className="outlet-content-body">
                {contentError ? (
                  <p role="alert" className="text-center text-red-600">
                    {contentError}
                  </p>
                ) : (
                  <EditorContent editor={editor} />
                )}
              </div>
            </section>
          </main>
        </div>
      </div>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isOrdering) {
              setSelectedProduct(null);
              setOrderMessage("");
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {orderSucceeded ? (
              <>
                <p className="text-lg font-semibold text-gray-900" role="status">
                  Pedido efetuado com sucesso.
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setOrderMessage("");
                      setOrderSucceeded(false);
                    }}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900">
                  Tem a certeza de que quer pedir{" "}
                  {selectedProduct.item_name1 || "este artigo"}?
                </h2>

                {orderMessage && (
                  <p className="mt-4 text-sm text-gray-700" role="alert">
                    {orderMessage}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setOrderMessage("");
                    }}
                    disabled={isOrdering}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={orderProduct}
                    disabled={
                      isOrdering ||
                      !isLoggedIn ||
                      ![true, 1, "1"].includes(selectedProduct.order)
                    }
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {isOrdering ? "A enviar..." : "Sim, pedir"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}