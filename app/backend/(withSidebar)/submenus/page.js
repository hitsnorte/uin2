"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function SubmenusPage() {
  const [submenus, setSubmenus] = useState([]);
  const [menus, setMenus] = useState([]);
  const [languages, setLanguages] = useState([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({
    submenu_name1: "",
    submenu_name2: "",
    submenu_name3: "",
    submenu_name4: "",
    submenu_name5: "",
    menu_id: "",
  });

  // ✅ IMAGE STATE (FIXED)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  // ---------------- FETCH ----------------

  async function fetchSubmenus() {
    const res = await fetch("/api/submenus");
    const data = await res.json();
    setSubmenus(data);
  }

  async function fetchMenus() {
    const res = await fetch("/api/menus");
    const data = await res.json();
    setMenus(data);
  }

  async function fetchLanguages() {
    const res = await fetch("/api/languages");
    const data = await res.json();

    const sorted = data.sort((a, b) => a.lang_order - b.lang_order);
    setLanguages(sorted);
  }

  useEffect(() => {
    fetchSubmenus();
    fetchMenus();
    fetchLanguages();
  }, []);

  // ---------------- MODAL ----------------

  function openCreate() {
    setEditingId(null);

    setForm({
      submenu_name1: "",
      submenu_name2: "",
      submenu_name3: "",
      submenu_name4: "",
      submenu_name5: "",
      menu_id: "",
    });

    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);

    setShowModal(true);
  }

  function openEdit(submenu) {
    setEditingId(submenu.submenu_id);

    setForm({
      submenu_name1: submenu.submenu_name1 || "",
      submenu_name2: submenu.submenu_name2 || "",
      submenu_name3: submenu.submenu_name3 || "",
      submenu_name4: submenu.submenu_name4 || "",
      submenu_name5: submenu.submenu_name5 || "",
      menu_id: submenu.menu_id ? String(submenu.menu_id) : "",
    });

    setImageFile(null);
    setImagePreview(submenu.submenu_card_background || null);
    setExistingImage(submenu.submenu_card_background || null);

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
        submenu_card_background: imageUrl,
        menu_id: form.menu_id ? Number(form.menu_id) : null,
      };

      const url = editingId
        ? `/api/submenus/${editingId}`
        : "/api/submenus";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Save failed");

      await fetchSubmenus();

      setShowModal(false);
      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);
    } catch (err) {
      console.error(err);
      alert("Error saving submenu");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(id) {
    try {
      setDeletingId(id);

      const response = await fetch(`/api/submenus/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await fetchSubmenus();
    } catch (err) {
      console.error(err);
      alert("Error deleting submenu");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleVisible(submenu) {
    await fetch(`/api/submenus/${submenu.submenu_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visible: !submenu.visible,
      }),
    });

    fetchSubmenus();
  }

  // ---------------- FILTER ----------------

  const filtered = submenus.filter((submenu) =>
    languages.some((lang) => {
      const field = `submenu_name${lang.lang_order}`;
      return (submenu[field] || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    })
  );

  const menusWithSubmenus = menus.filter((menu) => menu.has_submenus === true);

  function getMenuName(menu) {
    return menu[`menu_name${languages[0]?.lang_order || 1}`] || menu.menu_name1 || `Menu ${menu.menu_id}`;
  }

  function getParentMenuName(menuId) {
    const menu = menus.find((item) => item.menu_id === menuId);
    return menu ? getMenuName(menu) : "-";
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="-mx-6 -mt-6">
        <Topbar title="Submenus" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar submenus..."
          className="h-11 w-80 border rounded-lg px-3"
        />

        <button
          onClick={openCreate}
          className="h-11 px-5 bg-red-500 text-white rounded-lg"
        >
          + Criar Submenu
        </button>

      </div>

      {/* TABLE (unchanged) */}
      <div className="bg-white border rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Menu</th>

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
            {filtered.map((submenu) => (
              <tr key={submenu.submenu_id} className="border-t">
                <td className="p-4">{submenu.submenu_id}</td>
                <td className="p-4">{getParentMenuName(submenu.menu_id)}</td>

                {languages.map((lang) => {
                  const field = `submenu_name${lang.lang_order}`;
                  return (
                    <td key={lang.lang_id} className="p-4">
                      {submenu[field]}
                    </td>
                  );
                })}

                <td className="p-4">
                  <button
                    onClick={() => toggleVisible(submenu)}
                    className="px-3 py-1 rounded-lg"
                  >
                    {submenu.visible ? "Visível" : "Oculto"}
                  </button>
                </td>

                <td className="p-4 flex gap-2 justify-end">
                  <button
                    onClick={() => openEdit(submenu)}
                    className="px-3 py-1 bg-gray-200 rounded-lg"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => remove(submenu.submenu_id)}
                    disabled={deletingId === submenu.submenu_id}
                    className={`px-3 py-1 rounded-lg ${deletingId === submenu.submenu_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 text-white"}`}
                  >
                    {deletingId === submenu.submenu_id ? "Eliminar" : "Eliminar"}
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
              const field = `submenu_name${lang.lang_order}`;

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

            <select
              name="menu_id"
              value={form.menu_id}
              onChange={handleChange}
              className="h-10 border rounded-lg px-3"
            >
              <option value="">Sem menu associado</option>
              {menusWithSubmenus.map((menu) => (
                <option key={menu.menu_id} value={menu.menu_id}>
                  {getMenuName(menu)}
                </option>
              ))}
            </select>

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