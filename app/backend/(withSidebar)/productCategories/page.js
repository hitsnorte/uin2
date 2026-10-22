"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function ItemSubfamiliesPage() {
  const [categories, setCategories] = useState([]);
  const [families, setFamilies] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    category_name1: "",
    category_name2: "",
    category_name3: "",
    category_name4: "",
    category_name5: "",
  });
  const [itemFamilyId, setItemFamilyId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [editingId, setEditingId] = useState(null);

  async function fetchCategories() {
    const res = await fetch("/api/productCategories");
    const data = await res.json();
    setCategories(data);
  }

  async function fetchFamilies() {
    const res = await fetch("/api/productFamilies");
    const data = await res.json();
    setFamilies(data);
  }

  async function fetchLanguages() {
    const res = await fetch("/api/languages");
    const data = await res.json();
    const sorted = data.sort((a, b) => (a.lang_order || 0) - (b.lang_order || 0));
    setLanguages(sorted);
  }

  useEffect(() => {
    fetchCategories();
    fetchFamilies();
    fetchLanguages();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({
      category_name1: "",
      category_name2: "",
      category_name3: "",
      category_name4: "",
      category_name5: "",
    });
    setItemFamilyId("");
    setShowModal(true);
  }

  function openEdit(category) {
    setEditingId(category.item_subfamily_id);
    setForm({
      category_name1: category.category_name1 || "",
      category_name2: category.category_name2 || "",
      category_name3: category.category_name3 || "",
      category_name4: category.category_name4 || "",
      category_name5: category.category_name5 || "",
    });
    setItemFamilyId(
      category.item_family_id ? String(category.item_family_id) : ""
    );
    setShowModal(true);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.category_name1) return;
    setIsSaving(true);

    const payload = {
      ...form,
      item_family_id: itemFamilyId ? Number(itemFamilyId) : null,
    };

    try {
      if (!editingId) {
        await fetch("/api/productCategories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/productCategories/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      setForm({
        category_name1: "",
        category_name2: "",
        category_name3: "",
        category_name4: "",
        category_name5: "",
      });
      setItemFamilyId("");
      setEditingId(null);
      fetchCategories();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory(id) {
    try {
      setDeletingId(id);

      const response = await fetch(`/api/productCategories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Erro ao eliminar categoria de item");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = categories.filter((category) =>
    languages.some((lang) => {
      const field = `category_name${lang.lang_order}`;
      return (category[field] || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    }) ||
    (category.category_name1 || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Subfamílias de Itens" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar subfamília..."
          className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
        />

        <button
          onClick={openCreate}
          disabled={showModal || isSaving}
          className={`h-11 px-5 rounded-lg ${showModal || isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
        >
          + Criar Subfamília
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
              <th className="p-4">Família</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((category) => {
              const family = families.find(
                (item) => item.item_family_id === category.item_family_id
              );

              return (
                <tr
                  key={category.item_subfamily_id}
                  className="border-t border-gray-100"
                >
                  <td className="p-4 text-gray-500">
                    {category.item_subfamily_id}
                  </td>

                  {languages.length > 0 ? (
                    languages.map((lang) => {
                      const field = `category_name${lang.lang_order}`;
                      return (
                        <td key={lang.lang_id} className="p-4 font-medium text-gray-800">
                          {category[field] || "-"}
                        </td>
                      );
                    })
                  ) : (
                    <td className="p-4 font-medium text-gray-800">
                      {category.category_name1}
                    </td>
                  )}

                  <td className="p-4 text-gray-600">
                    {family?.item_family_name || "-"}
                  </td>

                  <td className="p-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(category)}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => deleteCategory(category.item_subfamily_id)}
                      disabled={deletingId === category.item_subfamily_id}
                      className={`px-3 py-1 rounded-lg text-sm ${deletingId === category.item_subfamily_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
                    >
                      {deletingId === category.item_subfamily_id ? "Eliminar" : "Eliminar"}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[360px] max-w-[90vw]">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Editar Subfamília" : "Criar Subfamília"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {languages.length > 0 ? (
                languages.map((language) => {
                  const field = `category_name${language.lang_order}`;
                  return (
                    <input
                      key={language.lang_id}
                      name={field}
                      value={form[field] || ""}
                      onChange={handleChange}
                      placeholder={`Nome (${language.lang_name})`}
                      className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                    />
                  );
                })
              ) : (
                <input
                  name="category_name1"
                  value={form.category_name1}
                  onChange={handleChange}
                  placeholder="Nome da categoria"
                  className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                />
              )}

              <select
                value={itemFamilyId}
                onChange={(e) => setItemFamilyId(e.target.value)}
                className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none bg-white"
              >
                <option value="">Selecionar família</option>
                {families.map((family) => (
                  <option
                    key={family.item_family_id}
                    value={family.item_family_id}
                  >
                    {family.item_family_name}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2">
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
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
                >
                  {isSaving ? (editingId ? "Guardar" : "Criar") : editingId ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}