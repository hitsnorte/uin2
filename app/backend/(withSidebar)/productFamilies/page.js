"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function ProductFamiliesPage() {
  const [families, setFamilies] = useState([]);
  const [groups, setGroups] = useState([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [productGroupId, setProductGroupId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [editingId, setEditingId] = useState(null);

  async function fetchFamilies() {
    const res = await fetch("/api/productFamilies");
    const data = await res.json();
    setFamilies(data);
  }

  async function fetchGroups() {
    const res = await fetch("/api/productGroups");
    const data = await res.json();
    setGroups(data);
  }

  useEffect(() => {
    fetchFamilies();
    fetchGroups();
  }, []);

  function openCreate() {
    setEditingId(null);
    setName("");
    setProductGroupId("");
    setShowModal(true);
  }

  function openEdit(family) {
    setEditingId(family.product_family_id);
    setName(family.product_family_name || "");
    setProductGroupId(
      family.product_group_id ? String(family.product_group_id) : ""
    );
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name) return;
    setIsSaving(true);

    const payload = {
      product_family_name: name,
      product_group_id: productGroupId ? Number(productGroupId) : null,
    };

    try {
      if (!editingId) {
        await fetch("/api/productFamilies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/productFamilies/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      setName("");
      setProductGroupId("");
      setEditingId(null);
      fetchFamilies();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteFamily(id) {
    try {
      setDeletingId(id);

      const response = await fetch(`/api/productFamilies/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await fetchFamilies();
    } catch (err) {
      console.error(err);
      alert("Erro ao eliminar família de item");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = families.filter((f) =>
    (f.product_family_name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Famílias de Itens" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar família..."
          className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
        />

        <button
          onClick={openCreate}
          disabled={showModal || isSaving}
          className={`h-11 px-5 rounded-lg ${showModal || isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
        >
          + Criar Família
        </button>
      </div>

      {/* TABLE */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Nome</th>
              <th className="p-4">Grupo</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((family) => {
              const group = groups.find(
                (g) => g.product_group_id === family.product_group_id
              );

              return (
                <tr
                  key={family.product_family_id}
                  className="border-t border-gray-100"
                >
                  <td className="p-4 text-gray-500">
                    {family.product_family_id}
                  </td>

                  <td className="p-4 font-medium text-gray-800">
                    {family.product_family_name}
                  </td>

                  <td className="p-4 text-gray-600">
                    {group?.product_group_name || "-"}
                  </td>

                  <td className="p-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(family)}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => deleteFamily(family.product_family_id)}
                      disabled={deletingId === family.product_family_id}
                      className={`px-3 py-1 rounded-lg text-sm ${deletingId === family.product_family_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
                    >
                      {deletingId === family.product_family_id ? "Eliminar" : "Eliminar"}
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
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[380px]">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Editar Família" : "Criar Família"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* NAME */}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da família"
                className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
              />

              {/* GROUP SELECT */}
              <select
                value={productGroupId}
                onChange={(e) => setProductGroupId(e.target.value)}
                className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none bg-white"
              >
                <option value="">Sem grupo</option>

                {groups.map((g) => (
                  <option
                    key={g.product_group_id}
                    value={g.product_group_id}
                  >
                    {g.product_group_name}
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