"use client";

import { useEffect, useState } from "react";
import Editor from "@/components/editor/page.js";
import Topbar from "@/components/layout/Topbar";

export default function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [editorContent, setEditorContent] = useState(null);

  const [form, setForm] = useState({
    subcategory_name1: "",
    subcategory_name2: "",
    subcategory_name3: "",
    subcategory_name4: "",
    subcategory_name5: "",
    subcategory_type: 1,
    category_id: "",
  });

  // ---------------- IMAGE STATE ----------------

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  // ---------------- FETCH ----------------

  async function fetchData() {
    const [subs, cats, langs] = await Promise.all([
      fetch("/api/subcategories").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/languages").then((r) => r.json()),
    ]);

    const normalizedLangs = langs
      .sort((a, b) => (a.lang_order ?? 999) - (b.lang_order ?? 999))
      .map((l, i) => ({
        ...l,
        safe_order: l.lang_order ?? i + 1,
      }));

    setSubcategories(subs);
    setCategories(cats);
    setLanguages(normalizedLangs);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------- CREATE ----------------

  function openCreate() {
    setEditingId(null);

    setForm({
      subcategory_name1: "",
      subcategory_name2: "",
      subcategory_name3: "",
      subcategory_name4: "",
      subcategory_name5: "",
      subcategory_type: 1,
      category_id: "",
    });

    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);

    setShowModal(true);
  }

  // ---------------- EDIT ----------------

  function openEdit(sub) {
    setEditingId(sub.subcategory_id);

    setForm({
      subcategory_name1: sub.subcategory_name1 || "",
      subcategory_name2: sub.subcategory_name2 || "",
      subcategory_name3: sub.subcategory_name3 || "",
      subcategory_name4: sub.subcategory_name4 || "",
      subcategory_name5: sub.subcategory_name5 || "",
      subcategory_type: sub.subcategory_type || 1,
      category_id: sub.category_id || "",
    });

    setImageFile(null);

    setImagePreview(sub.subcategory_card_background || null);

    setExistingImage(sub.subcategory_card_background || null);

    setShowModal(true);
  }

  // ---------------- CONTENT ----------------

  async function openContent(sub) {
    setSelectedSub(sub);

    const res = await fetch(
      `/api/info-subcategory?subcategory_id=${sub.subcategory_id}`
    );

    const data = await res.json();

    setEditorContent(data?.content || null);

    setShowContentModal(true);
  }

  async function saveContent() {
    await fetch("/api/info-subcategory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subcategory_id: selectedSub.subcategory_id,
        content: editorContent,
      }),
    });

    setShowContentModal(false);
  }

  // ---------------- FORM ----------------

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  // ---------------- IMAGE UPLOAD ----------------

  async function uploadImage(file) {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();

    return data.url;
  }

  // ---------------- CRUD ----------------

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      let imageUrl = existingImage;

      if (imageFile instanceof File) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload = {
        ...form,
        category_id: Number(form.category_id),
        subcategory_type: Number(form.subcategory_type),
        subcategory_card_background: imageUrl,
      };

      if (!editingId) {
        await fetch("/api/subcategories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/subcategories/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);

      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);

      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro ao guardar subcategoria");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(id) {
    try {
      setDeletingId(id);

      const response = await fetch(`/api/subcategories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro ao eliminar subcategoria");
    } finally {
      setDeletingId(null);
    }
  }

  // ---------------- FILTER ----------------

  const filtered = subcategories.filter((s) =>
    languages.some((lang) => {
      const field = `subcategory_name${lang.safe_order}`;

      return (s[field] || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    })
  );

  function getCategoryName(id) {
    const cat = categories.find((c) => c.category_id === id);

    return cat?.category_name1 || "—";
  }

  function getTypeLabel(type) {
    if (type === 1) return "Info";
    if (type === 2) return "Reservation";
    if (type === 3) return "Order";

    return "-";
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="-mx-6 -mt-6">
        <Topbar title="Sub-Categorias" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar subcategorias..."
          className="h-11 w-80 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none bg-white"
        />

        <button
          onClick={openCreate}
          disabled={showModal || isSaving}
          className={`h-11 px-5 rounded-lg ${showModal || isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
        >
          + Criar Subcategoria
        </button>

      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-2xl shadow overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="p-4">ID</th>

              {languages.map((lang) => (
                <th key={lang.lang_id} className="p-4">
                  {lang.lang_name}
                </th>
              ))}

              <th className="p-4">Categoria</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((sub) => (
              <tr key={sub.subcategory_id} className="border-t">

                <td className="p-4">
                  {sub.subcategory_id}
                </td>

                {languages.map((lang) => {
                  const field = `subcategory_name${lang.safe_order}`;

                  return (
                    <td key={lang.lang_id} className="p-4">
                      {sub[field]}
                    </td>
                  );
                })}

                <td className="p-4">
                  {getCategoryName(sub.category_id)}
                </td>

                <td className="p-4">
                  {getTypeLabel(sub.subcategory_type)}
                </td>

                <td className="p-4 flex gap-2 justify-end">

                  <button
                    onClick={() => openContent(sub)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg"
                  >
                    Conteúdo
                  </button>

                  <button
                    onClick={() => openEdit(sub)}
                    className="px-3 py-1 bg-gray-200 rounded-lg"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => remove(sub.subcategory_id)}
                    disabled={deletingId === sub.subcategory_id}
                    className={`px-3 py-1 rounded-lg ${deletingId === sub.subcategory_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 text-white"}`}
                  >
                    {deletingId === sub.subcategory_id ? "Eliminando..." : "Eliminar"}
                  </button>

                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl w-[450px] flex flex-col gap-3"
          >

            <h2 className="text-lg font-semibold">
              {editingId ? "Editar" : "Criar"} Subcategoria
            </h2>

            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="h-10 border rounded-lg px-2"
              required
            >
              <option value="">Selecionar categoria</option>

              {categories.map((c) => (
                <option
                  key={c.category_id}
                  value={c.category_id}
                >
                  {c.category_name1}
                </option>
              ))}
            </select>

            <select
              name="subcategory_type"
              value={form.subcategory_type}
              onChange={handleChange}
              className="h-10 border rounded-lg px-2"
            >
              <option value={1}>Info</option>
              {/* <option value={2}>Reservation</option> */}
              {/* <option value={3}>Order</option> */}
            </select>

            {languages.map((lang) => {
              const field = `subcategory_name${lang.safe_order}`;

              return (
                <input
                  key={lang.lang_id}
                  name={field}
                  value={form[field] || ""}
                  onChange={handleChange}
                  placeholder={lang.lang_name}
                  className="h-10 border rounded-lg px-3"
                />
              );
            })}

            {/* IMAGE */}
            <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-red-400 hover:bg-red-50 transition flex flex-col items-center justify-center text-center">
  <div className="text-4xl mb-2">🖼️</div>

  <span className="font-medium text-gray-700">
    Clique para selecionar uma imagem
  </span>

  <span className="text-sm text-gray-500 mt-1">
    PNG, JPG, JPEG, WEBP
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
        alert("A imagem não pode exceder 850 KB.");
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }}
  />
</label>

            {imagePreview && (
  <div className="relative overflow-hidden rounded-xl border bg-gray-50">
    <img
      src={imagePreview}
      alt="Preview"
      className="w-full h-48 object-cover"
    />

    <button
      type="button"
      onClick={() => {
        setImageFile(null);
        setImagePreview(null);
        setExistingImage(null);
      }}
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

    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-3 py-2">
      Imagem selecionada
    </div>
  </div>
)}

            <div className="flex justify-end gap-2 mt-2">

              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200"}`}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 text-white"}`}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* CONTENT MODAL */}
      {showContentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white w-[90vw] h-[85vh] rounded-2xl p-6 flex flex-col">

            <h2 className="text-xl font-semibold mb-4">
              Conteúdo - {selectedSub?.subcategory_name1}
            </h2>

            <div className="flex-1 overflow-hidden">
              <Editor
                value={editorContent}
                onChange={setEditorContent}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">

              <button
                onClick={() => setShowContentModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Fechar
              </button>

              <button
                onClick={saveContent}
                className="px-4 py-2 bg-red-500 text-white rounded-lg"
              >
                Guardar
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}