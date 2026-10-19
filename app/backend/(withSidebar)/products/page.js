"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [preparationGroups, setPreparationGroups] = useState([]);
  const [preparations, setPreparations] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("base");
  const [showProductTypeError, setShowProductTypeError] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    product_name1: "",
    product_name2: "",
    product_name3: "",
    product_name4: "",
    product_name5: "",
    product_description1: "",
    product_description2: "",
    product_description3: "",
    product_description4: "",
    product_description5: "",
    product_image_url: "",
    product_price: "",
    visiblePrice: false,
    product_type: "",
    allowReservations: "0",
    scheduleID: "",
    preparation: "",
    reservation: false,
    checkin: false,
    room: false,
    instantOrder: false,
    sendStaychat: false,
    staychatWebhook: "",
  });

  const [productCatId, setProductCatId] = useState("");
  const [preparationGroupId, setPreparationGroupId] = useState("");

  async function fetchProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  }

  async function fetchCategories() {
    const res = await fetch("/api/productCategories");
    const data = await res.json();
    setCategories(data);
  }

  async function fetchLanguages() {
    const res = await fetch("/api/languages");
    const data = await res.json();
    const sorted = data.sort(
      (a, b) => (a.lang_order || 0) - (b.lang_order || 0)
    );
    setLanguages(sorted);
  }

  async function fetchPreparations() {
    const [groupsRes, preparationsRes] = await Promise.all([
      fetch("/api/preparationGroups"),
      fetch("/api/preparation"),
    ]);

    setPreparationGroups(await groupsRes.json());
    setPreparations(await preparationsRes.json());
  }

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchLanguages();
    fetchPreparations();
  }, []);

  function openCreate() {
    setEditingId(null);
    setActiveTab("base");
    setShowProductTypeError(false);
    setForm({
      product_name1: "",
      product_name2: "",
      product_name3: "",
      product_name4: "",
      product_name5: "",
      product_description1: "",
      product_description2: "",
      product_description3: "",
      product_description4: "",
      product_description5: "",
      product_image_url: "",
      product_price: "",
      visiblePrice: false,
      product_type: "",
      allowReservations: "0",
      scheduleID: "",
      preparation: "",
      reservation: false,
      checkin: false,
      room: false,
      instantOrder: false,
      sendStaychat: false,
      staychatWebhook: "",
    });
    setProductCatId("");
    setPreparationGroupId("");
    setShowModal(true);
  }

  function openEdit(product) {
    setEditingId(product.product_id);
    setActiveTab("base");
    setShowProductTypeError(false);

    const savedPreparation = product.preparation
      ? typeof product.preparation === "string"
        ? JSON.parse(product.preparation)
        : product.preparation
      : null;
    const savedGroupId = savedPreparation?.groups?.[0]?.preparation_group_id;

    setForm({
      product_name1: product.product_name1 || "",
      product_name2: product.product_name2 || "",
      product_name3: product.product_name3 || "",
      product_name4: product.product_name4 || "",
      product_name5: product.product_name5 || "",
      product_description1: product.product_description1 || "",
      product_description2: product.product_description2 || "",
      product_description3: product.product_description3 || "",
      product_description4: product.product_description4 || "",
      product_description5: product.product_description5 || "",
      product_image_url: product.product_image_url || "",
      product_price: product.product_price ?? "",
      visiblePrice: product.visiblePrice === true || product.visiblePrice === "1",
      product_type: product.product_type || "",
      allowReservations:
        product.allowReservations === true || product.allowReservations === "1" ? "1" : "0",
      scheduleID: product.scheduleID || "",
      preparation: savedPreparation ? JSON.stringify(savedPreparation, null, 2) : "",
      reservation: product.reservation === true || product.reservation === "1",
      checkin: product.checkin === true || product.checkin === "1",
      room: product.room === true || product.room === "1",
      instantOrder: product.instantOrder === true || product.instantOrder === "1",
      sendStaychat: product.sendStaychat === true || product.sendStaychat === "1",
      staychatWebhook: product.staychatWebhook || "",
    });

    setProductCatId(product.product_cat_id ? String(product.product_cat_id) : "");
    setPreparationGroupId(savedGroupId ? String(savedGroupId) : "");
    setShowModal(true);
  }

  function handlePreparationGroupChange(e) {
    const groupId = e.target.value;
    setPreparationGroupId(groupId);

    if (!groupId) {
      setForm((prev) => ({ ...prev, preparation: "" }));
      return;
    }

    const group = preparationGroups.find(
      (item) => item.preparation_group_id === Number(groupId)
    );
    const groupPreparations = preparations.filter(
      (item) => item.preparation_group_id === Number(groupId)
    );

    setForm((prev) => ({
      ...prev,
      preparation: JSON.stringify(
        {
          groups: [
            {
              preparation_group_id: group.preparation_group_id,
              preparations: groupPreparations.map(
                (preparation) => preparation.preparation_id
              ),
            },
          ],
        },
        null,
        2
      ),
    }));
  }

  function handleChange(e) {
    const { name, type, value, checked } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };

      if (name === "product_type" && value !== "Produto") {
        next.product_price = "";
        next.visiblePrice = false;
        next.allowReservations = "0";
        next.scheduleID = "";
      }

      return next;
    });
  }

  async function uploadImage(file) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.url) {
      setForm((prev) => ({
        ...prev,
        product_image_url: data.url,
      }));
    }
  }

  function removeImage() {
    setForm((prev) => ({
      ...prev,
      product_image_url: "",
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.product_type) {
      setActiveTab("settings");
      setShowProductTypeError(true);
      return;
    }

    if (!form.product_name1) return;

    setIsSaving(true);

    let preparationJson = null;

    try {
      preparationJson = form.preparation ? JSON.parse(form.preparation) : null;
    } catch (err) {
      alert("JSON inválido em preparation");
      setIsSaving(false);
      return;
    }

    const isProductType = form.product_type === "Produto";

    const payload = {
      ...form,
      preparation: preparationJson,
      product_cat_id: productCatId ? Number(productCatId) : null,
      product_price:
        isProductType && form.product_price !== ""
          ? String(form.product_price).trim()
          : null,
      allowReservations: isProductType ? form.allowReservations : "0",
      scheduleID:
        isProductType && form.allowReservations === "1"
          ? form.scheduleID.trim()
          : null,
      reservation: form.reservation,
      checkin: form.checkin,
      room: form.room,
      instantOrder: form.instantOrder,
      sendStaychat: form.sendStaychat,
      staychatWebhook: form.staychatWebhook.trim() || null,
    };

    try {
      if (!editingId) {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/products/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      setEditingId(null);
      fetchProducts();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProduct(id) {
    try {
      setDeletingId(id);

      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });

      if (!response.ok) throw new Error("Delete failed");

      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Erro ao eliminar item");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = products.filter((product) =>
    languages.some((lang) => {
      const field = `product_name${lang.lang_order}`;
      return (product[field] || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Itens" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar item..."
          className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
        />

        <button
          onClick={openCreate}
          disabled={showModal || isSaving}
          className={`h-11 px-5 rounded-lg ${showModal || isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
        >
          + Criar Item
        </button>
      </div>

      {/* TABLE */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="p-4">ID</th>

              {languages.length > 0 ? (
                languages.map((lang) => (
                  <th key={lang.lang_id} className="p-4">
                    {lang.lang_name}
                  </th>
                ))
              ) : (
                <th className="p-4">Nome</th>
              )}

              <th className="p-4">Categoria</th>
              <th className="p-4">Preço</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((product) => {
              const category = categories.find(
                (c) => c.product_cat_id === product.product_cat_id
              );

              return (
                <tr key={product.product_id} className="border-t border-gray-100">
                  <td className="p-4 text-gray-500">{product.product_id}</td>

                  {languages.length > 0 ? (
                    languages.map((lang) => {
                      const field = `product_name${lang.lang_order}`;
                      return (
                        <td
                          key={lang.lang_id}
                          className="p-4 font-medium text-gray-800"
                        >
                          {product[field] || "-"}
                        </td>
                      );
                    })
                  ) : (
                    <td className="p-4 font-medium text-gray-800">
                      {product.product_name1}
                    </td>
                  )}

                  <td className="p-4 text-gray-600">
                    {category?.category_name1 || "-"}
                  </td>

                  <td className="p-4 text-gray-700">
                    {Number(product.product_price || 0).toFixed(2)} €
                  </td>

                  <td className="p-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(product)}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => deleteProduct(product.product_id)}
                      disabled={deletingId === product.product_id}
                      className={`px-3 py-1 rounded-lg text-sm ${deletingId === product.product_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
                    >
                      {deletingId === product.product_id ? "Eliminar" : "Eliminar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-lg font-semibold">
                {editingId ? "Editar Item" : "Criar Item"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="border-b px-6">
              <div className="flex gap-6" role="tablist" aria-label="Secções do item">
                {[
                  ["base", "Base"],
                  ["settings", "Configurações"],
                ].map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
                      activeTab === tab
                        ? "border-red-500 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <form id="product-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
                {activeTab === "base" ? (
                  <div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-3">Nomes</p>
                      {languages.length > 0 ? (
                        languages.map((language) => {
                          const field = `product_name${language.lang_order}`;
                          return (
                            <input
                              key={language.lang_id}
                              name={field}
                              value={form[field] || ""}
                              onChange={handleChange}
                              placeholder={`Nome (${language.lang_name})`}
                              className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none mb-2"
                            />
                          );
                        })
                      ) : (
                        <input
                          name="product_name1"
                          value={form.product_name1}
                          onChange={handleChange}
                          placeholder="Nome do item"
                          className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                        />
                      )}
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-semibold text-gray-600 mb-3">Descrições</p>
                      {languages.length > 0 ? (
                        languages.map((language) => {
                          const field = `product_description${language.lang_order}`;
                          return (
                            <textarea
                              key={language.lang_id}
                              name={field}
                              value={form[field] || ""}
                              onChange={handleChange}
                              placeholder={`Descrição (${language.lang_name})`}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-500 outline-none mb-2 resize-none"
                              rows="2"
                            />
                          );
                        })
                      ) : (
                        <textarea
                          name="product_description1"
                          value={form.product_description1 || ""}
                          onChange={handleChange}
                          placeholder="Descrição do item"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-500 outline-none resize-none"
                          rows="2"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-3">Categoria</p>
                      <select
                        value={productCatId}
                        onChange={(e) => setProductCatId(e.target.value)}
                        className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white focus:border-red-500 outline-none"
                      >
                        <option value="">Selecionar categoria</option>
                        {categories.map((cat) => (
                          <option key={cat.product_cat_id} value={cat.product_cat_id}>
                            {cat.category_name1}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-3">Tipo de item</p>
                      <select
                        name="product_type"
                        value={form.product_type}
                        onChange={(e) => {
                          handleChange(e);
                          if (e.target.value) setShowProductTypeError(false);
                        }}
                        aria-invalid={showProductTypeError}
                        aria-describedby={showProductTypeError ? "product-type-error" : undefined}
                        className={`w-full h-11 border rounded-lg px-3 bg-white outline-none ${showProductTypeError ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-red-500"}`}
                      >
                        <option value="">Selecionar tipo</option>
                        <option value="Informação">Informação</option>
                        <option value="Produto">Produto</option>
                      </select>
                      {showProductTypeError && (
                        <p id="product-type-error" role="alert" className="mt-2 text-sm text-red-600">
                          Tipo de item é obrigatório.
                        </p>
                      )}
                    </div>

                    {form.product_type === "Produto" && (
                      <div>
                        <p className="text-sm font-semibold text-gray-600 mb-3">Preço</p>
                        <input
                          type="number"
                          name="product_price"
                          value={form.product_price}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                        />
                        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            name="visiblePrice"
                            checked={form.visiblePrice}
                            onChange={handleChange}
                            className="h-4 w-4 accent-red-500"
                          />
                          <span>Mostrar preço</span>
                        </label>
                      </div>
                    )}

                    {form.product_type === "Produto" && (
                      <div>
                        <p className="text-sm font-semibold text-gray-600 mb-3">
                          Permite reservas
                        </p>
                        <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                          <input
                            type="checkbox"
                            name="allowReservations"
                            checked={form.allowReservations === "1"}
                            onChange={(e) => {
                              const allowed = e.target.checked;
                              setForm((prev) => ({
                                ...prev,
                                allowReservations: allowed ? "1" : "0",
                                scheduleID: allowed ? prev.scheduleID : "",
                              }));
                            }}
                            className="h-4 w-4 accent-red-500"
                          />
                          <span>Sim</span>
                        </label>
                        {form.allowReservations === "1" && (
                          <input
                            type="text"
                            name="scheduleID"
                            value={form.scheduleID}
                            onChange={handleChange}
                            maxLength={1}
                            placeholder="ID do horário"
                            className="mt-3 h-11 w-full border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                          />
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-3">
                        Grupo de preparação
                      </p>
                      <select
                        value={preparationGroupId}
                        onChange={handlePreparationGroupChange}
                        className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white focus:border-red-500 outline-none"
                      >
                        <option value="">Selecionar grupo de preparação</option>
                        {preparationGroups.map((group) => (
                          <option
                            key={group.preparation_group_id}
                            value={group.preparation_group_id}
                          >
                            {group.preparation_group_name || "-"}
                          </option>
                        ))}
                      </select>

                      {preparationGroupId && (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2">
                            Preparações adicionadas
                          </p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {preparations
                              .filter(
                                (preparation) =>
                                  preparation.preparation_group_id ===
                                  Number(preparationGroupId)
                              )
                              .map((preparation) => (
                                <li key={preparation.preparation_id}>
                                  {preparation.preparation_name1 || "-"}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-3">
                        Condições de pedido
                      </p>

                      <p className="text-xs text-gray-500 mb-2">
                        Selecione as condições em que este item estará disponível para pedido e como será enviado.
                      </p>

                      <div className="flex flex-col gap-3">
                        {[
                          ["reservation", "Reserva", "Apenas permite pedido com reserva identificada."],
                          ["checkin", "Check-in", "Apenas permite pedido com check-in efetuado."],
                          ["room", "Quarto", "Apenas permite pedido com reserva com quarto atribuido."],
                          ["instantOrder", "Carrinho", "Permite adicionar itens ao carrinho. (EM DESENVOLVIMENTO)"],
                        ].map(([field, label, description]) => (
                          <label
                            key={field}
                            className={`flex items-center gap-3 text-sm ${
                              field === "instantOrder"
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-gray-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={field}
                              checked={form[field]}
                              onChange={handleChange}
                              disabled={field === "instantOrder"}
                              className="h-4 w-4 accent-red-500"
                            />

                            <span>{label}</span>

                            <span className="relative group">
                              <span className="flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-[10px] font-semibold text-gray-500 cursor-help">
                                i
                              </span>

                              <span className="absolute left-6 top-1/2 -translate-y-1/2 z-10 hidden group-hover:block w-56 rounded-md bg-gray-800 px-3 py-2 text-xs font-normal text-white shadow-lg">
                                {description}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-3">
                        Envio de notificações
                      </p>
                      <label className="flex items-center gap-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          name="sendStaychat"
                          checked={form.sendStaychat}
                          onChange={handleChange}
                          className="h-4 w-4 accent-red-500"
                        />
                        <span>Stay Chat</span>
                      </label>
                      <input
                        type="url"
                        name="staychatWebhook"
                        value={form.staychatWebhook}
                        onChange={handleChange}
                        placeholder="URL do webhook Stay Chat"
                        className="mt-3 h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-3">Imagem do Item</p>
                      <ImageUpload
                        value={form.product_image_url}
                        onUpload={uploadImage}
                        onRemove={removeImage}
                      />
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="border-t p-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200 hover:bg-gray-300"}`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
              >
                {isSaving ? (editingId ? "Guardar" : "Criar") : editingId ? "Guardar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE UPLOAD COMPONENT */}
    </div>
  );
}

function ImageUpload({ value, onUpload, onRemove }) {
  return (
    <div className="flex flex-col gap-4">
      <label
        className="
          border-2 border-dashed border-gray-300
          rounded-2xl
          p-6
          cursor-pointer
          hover:border-red-400
          hover:bg-red-50
          transition
          flex flex-col items-center justify-center
          text-center
        "
      >
        <div className="text-4xl mb-2">🖼️</div>

        <span className="font-medium text-gray-700">
          Clique para selecionar uma imagem
        </span>

        <span className="text-sm text-gray-500 mt-1">
          PNG, JPG, JPEG ou WEBP
        </span>

        <span className="text-xs text-gray-400 mt-2">
          Tamanho máximo: 850 KB
        </span>

        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            if (file.size > 850 * 1024) {
              alert(
                "A imagem não pode exceder 850 KB."
              );
              return;
            }

            onUpload(file);
          }}
        />
      </label>

      {value && (
        <div
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            bg-gray-50
            w-fit
          "
        >
          <img
            src={value}
            alt="Preview"
            className="
              max-h-48
              min-w-[250px]
              object-cover
            "
          />

          <button
            type="button"
            onClick={onRemove}
            className="
              absolute top-3 right-3
              h-8 w-8
              rounded-full
              bg-red-600
              text-white
              shadow-lg
              hover:bg-red-700
              transition
              flex items-center justify-center
            "
          >
            ✕
          </button>

          <div
            className="
              absolute bottom-0 left-0 right-0
              bg-black/50
              text-white
              text-xs
              px-3 py-2
            "
          >
            Imagem carregada
          </div>
        </div>
      )}

    </div>
  );
}