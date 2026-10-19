"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function AreasPage() {
  const [areas, setAreas] = useState([]);
  const [languages, setLanguages] = useState([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({
    area_name1: "",
    area_name2: "",
    area_name3: "",
    area_name4: "",
    area_name5: "",
  });

  // ✅ IMAGE STATE (FIXED)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  // ---------------- FETCH ----------------

  async function fetchAreas() {
    const res = await fetch("/api/areas");
    const data = await res.json();
    setAreas(data);
  }

  async function fetchLanguages() {
    const res = await fetch("/api/languages");
    const data = await res.json();

    const sorted = data.sort((a, b) => a.lang_order - b.lang_order);
    setLanguages(sorted);
  }

  useEffect(() => {
    fetchAreas();
    fetchLanguages();
  }, []);

  // ---------------- MODAL ----------------

  function openCreate() {
    setEditingId(null);

    setForm({
      area_name1: "",
      area_name2: "",
      area_name3: "",
      area_name4: "",
      area_name5: "",
    });

    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);

    setShowModal(true);
  }

  function openEdit(cat) {
    setEditingId(cat.area_id);

    setForm({
      area_name1: cat.area_name1 || "",
      area_name2: cat.area_name2 || "",
      area_name3: cat.area_name3 || "",
      area_name4: cat.area_name4 || "",
      area_name5: cat.area_name5 || "",
    });

    setImageFile(null);
    setImagePreview(cat.area_card_background || null);
    setExistingImage(cat.area_card_background || null);

    setShowModal(true);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // ---------------- IMAGE UPLOAD ----------------

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");

    const data = await response.json();
    return data.url;
  }

  // ---------------- SAVE (CREATE + EDIT FIXED) ----------------

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      let imageUrl = existingImage;

      // upload only if new file selected
      if (imageFile instanceof File) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload = {
        ...form,
        area_card_background: imageUrl,
      };

      const url = editingId
        ? `/api/areas/${editingId}`
        : "/api/areas";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Save failed");

      await fetchAreas();

      setShowModal(false);
      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);
    } catch (err) {
      console.error(err);
      alert("Error saving area");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(id) {
    try {
      setDeletingId(id);

      const response = await fetch(`/api/areas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await fetchAreas();
    } catch (err) {
      console.error(err);
      alert("Error deleting area");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleVisible(cat) {
    await fetch(`/api/areas/${cat.area_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visible: !cat.visible,
      }),
    });

    fetchAreas();
  }

  // ---------------- FILTER ----------------

  const filtered = areas.filter((c) =>
    languages.some((lang) => {
      const field = `area_name${lang.lang_order}`;
      return (c[field] || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="-mx-6 -mt-6">
        <Topbar title="Areas" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar areas..."
          className="h-11 w-80 border rounded-lg px-3"
        />

        <button
          onClick={openCreate}
          className="h-11 px-5 bg-red-500 text-white rounded-lg"
        >
          + Criar Area
        </button>

      </div>

      {/* TABLE (unchanged) */}
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

              <th className="p-4">Visible</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((cat) => (
              <tr key={cat.area_id} className="border-t">
                <td className="p-4">{cat.area_id}</td>

                {languages.map((lang) => {
                  const field = `area_name${lang.lang_order}`;
                  return (
                    <td key={lang.lang_id} className="p-4">
                      {cat[field]}
                    </td>
                  );
                })}

                <td className="p-4">
                  <button
                    onClick={() => toggleVisible(cat)}
                    className="px-3 py-1 rounded-lg"
                  >
                    {cat.visible ? "Visível" : "Oculto"}
                  </button>
                </td>

                <td className="p-4 flex gap-2 justify-end">
                  <button
                    onClick={() => openEdit(cat)}
                    className="px-3 py-1 bg-gray-200 rounded-lg"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => remove(cat.area_id)}
                    disabled={deletingId === cat.area_id}
                    className={`px-3 py-1 rounded-lg ${deletingId === cat.area_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 text-white"}`}
                  >
                    {deletingId === cat.area_id ? "Eliminar" : "Eliminar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl w-[450px] flex flex-col gap-3"
          >

            <h2 className="text-lg font-semibold">
              {editingId ? "Editar" : "Criar"}
            </h2>

            {languages.map((lang) => {
              const field = `area_name${lang.lang_order}`;

              return (
                <input
                  key={lang.lang_id}
                  name={field}
                  value={form[field] || ""}
                  onChange={handleChange}
                  className="h-10 border rounded-lg px-3"
                  placeholder={lang.lang_name}
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

            <div className="flex justify-end gap-2">
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
                {isSaving ? "Guardar" : "Guardar"}
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}