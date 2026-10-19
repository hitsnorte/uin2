"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import ProductNode from "../../../../components/editor/ProductNode";
import FrontendHeader from "@/components/layout/frontend/header";

import "./content.css";

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

function enrichProductNodes(value, productsById) {
  if (Array.isArray(value)) {
    return value.map((item) => enrichProductNodes(item, productsById));
  }

  if (!value || typeof value !== "object") return value;

  if (value.type === "product" && value.attrs?.productId) {
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
      enrichProductNodes(entry, productsById),
    ])
  );
}

export default function OutletPage() {
  const params = useParams();
  const router = useRouter();

  const [content, setContent] = useState(null);
  const [personalize, setPersonalize] = useState(null);
  const [areas, setAreas] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [selectedLang, setSelectedLang] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openArea, setOpenArea] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // ---------------- FETCH ----------------

  useEffect(() => {
    fetchData();
    checkSession();
  }, []);

  async function fetchData() {
    try {
      const [info, pers, areasData, outletsData, langs] = await Promise.all([
        fetch(`/api/info-subcategory/${params.id}`).then((r) =>
          r.json()
        ),

        fetch("/api/personalize").then((r) => r.json()),

        fetch("/api/areas").then((r) => r.json()),

        fetch("/api/outlets").then((r) => r.json()),

        fetch("/api/languages").then((r) => r.json()),
      ]);

      if (!Array.isArray(areasData) || !Array.isArray(outletsData)) {
        throw new TypeError("As APIs de áreas e outlets devem devolver listas.");
      }

      const productIds = collectProductIds(info?.content);
      const products = await Promise.all(
        productIds.map(async (productId) => {
          const response = await fetch(`/api/products/${productId}`);
          return response.ok ? response.json() : null;
        })
      );

      const productsById = new Map(
        products.filter(Boolean).map((product) => [
          Number(product.product_id),
          product,
        ])
      );
      setContent(enrichProductNodes(info?.content || null, productsById));
      setPersonalize(pers || null);
      setAreas(areasData.filter((area) => area.visible));
      setOutlets(outletsData.filter((outlet) => outlet.visible));
      setLanguages(langs || []);

      const savedLang = Number(localStorage.getItem("lang") || 1);
      setSelectedLang(savedLang);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function checkSession() {
    try {
      const response = await fetch("/api/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setIsLoggedIn(false);
        setCurrentUser(null);
        return;
      }

      const data = await response.json();
      setIsLoggedIn(Boolean(data?.authenticated));
      setCurrentUser(data?.authenticated ? data.user : null);
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      setIsLoggedIn(false);
      setCurrentUser(null);
    } finally {
      setCheckingSession(false);
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error("Erro ao terminar sessão:", data.message);
        return;
      }
      setIsLoggedIn(false);
      setCurrentUser(null);
      setMenuOpen(false);
      setOpenArea(null);
      window.location.href = "/homepage";
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
    }
  }

  function changeLang(order) {
    setSelectedLang(order);
    localStorage.setItem("lang", String(order));
    window.dispatchEvent(new Event("languageChanged"));
  }

  // ---------------- GET NAME ----------------

  function getName(item, field) {
    return (
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
    (outlet) => Number(outlet.outlet_id) === Number(params.id)
  );
  const quantity = Math.max(1, Number.parseInt(orderQuantity, 10) || 1);

  // ---------------- TIPTAP ----------------

  const editor = useEditor({
    editable: false,

    extensions: [
      StarterKit,
      Image,
      ProductNode.configure({
        onProductClick: handleProductClick,
      }),
    ],

    content: {
      type: "doc",
      content: [],
    },

    immediatelyRender: false,
  });

  async function handleProductClick(productId) {
    if (!productId) return;

    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error("Produto não encontrado");

      const product = await response.json();
      setSelectedProduct(product);
      setOrderQuantity(1);
      setOrderMessage("");
    } catch (error) {
      console.error("Não foi possível carregar o item", error);
    }
  }

  async function orderProduct() {
    if (!selectedProduct?.staychatWebhook || isOrdering) return;

    setIsOrdering(true);
    setOrderMessage("");

    try {
      const response = await fetch("/api/product-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.product_id,
          quantity,
        }),
      });

      if (!response.ok) throw new Error("Falha ao enviar pedido");

      setOrderMessage("Pedido enviado com sucesso.");
    } catch (error) {
      console.error("Não foi possível enviar o pedido", error);
      setOrderMessage("Não foi possível enviar o pedido.");
    } finally {
      setIsOrdering(false);
      setSelectedProduct(null)
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
      <FrontendHeader
        title={getName(activeOutlet, "outlet_name") || "Local"}
        areas={areas}
        outlets={outlets}
        personalize={personalize}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        openArea={openArea}
        setOpenArea={setOpenArea}
        onHomeClick={() => router.push("/homepage")}
        onOutletClick={(outletId) => {
          window.location.href = `/homepage/outlet/${outletId}`;
        }}
        languages={languages}
        selectedLang={selectedLang}
        onLanguageChange={changeLang}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        checkingSession={checkingSession}
        onLogout={handleLogout}
        onSignIn={() => {
          router.push("/homepage");
        }}
        onSignUp={() => {
          router.push("/homepage");
        }}
      />

      {/* CONTENT */}
      <div className="flex-1 p-6">
        <div
          className="max-w-4xl mx-auto p-8 rounded-2xl shadow-xl border"
          style={{
            background:
              personalize?.background_color || "#fff",

            color:
              personalize?.foreground_color || "#111",

            borderColor:
              personalize?.secondary_color + "22" ||
              "#00000022",
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedProduct.product_name1 || "Item sem nome"}
                </h2>
                {selectedProduct.product_description1 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedProduct.product_description1}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-xl text-gray-400 hover:text-gray-700"
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <p className="mt-4 text-lg font-semibold text-gray-900">
              {selectedProduct.product_price
  ? `${Number(selectedProduct.product_price).toFixed(2)} €`
  : ''}
            </p>

            <div className="mt-4">
              <label htmlFor="order-quantity" className="block text-sm font-medium text-gray-700">
                Quantidade
              </label>
              <div className="mt-2 flex w-fit items-center gap-5">
                <button
                  type="button"
                  onClick={() => setOrderQuantity(String(Math.max(1, quantity - 1)))}
                  disabled={quantity <= 1}
                  aria-label="Diminuir quantidade"
                  className="h-12 w-12 shrink-0 rounded-lg border border-gray-300 bg-white text-lg font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  -
                </button>
                <input
                  id="order-quantity"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={orderQuantity}
                  onChange={(event) => setOrderQuantity(event.target.value.replace(/\D/g, ""))}
                  onBlur={() => setOrderQuantity(String(quantity))}
                  aria-label="Quantidade"
                  className="h-12 w-20 rounded-lg border border-gray-300 bg-white text-center text-lg font-semibold text-gray-900 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setOrderQuantity(String(quantity + 1))}
                  aria-label="Aumentar quantidade"
                  className="h-12 w-12 shrink-0 rounded-lg border border-gray-300 bg-white text-lg font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700"
                >
                  +
                </button>
              </div>
            </div>

            <p className="mt-3 text-right text-sm font-semibold text-gray-700">
              Total: {(Number(selectedProduct.product_price || 0) * quantity).toFixed(2)} €
            </p>

            {orderMessage && (
              <p className="mt-4 text-sm text-gray-700">{orderMessage}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={orderProduct}
                disabled={
                  isOrdering ||
                  selectedProduct.sendStaychat !== "1" ||
                  !selectedProduct.staychatWebhook
                }
                className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isOrdering ? "A enviar..." : "Pedir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}