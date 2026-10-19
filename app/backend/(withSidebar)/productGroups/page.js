"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function ProductGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [editingId, setEditingId] = useState(null);

  async function fetchData() {
    const res = await fetch("/api/productGroups");
    const data = await res.json();
    setGroups(data);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreate() {
    setEditingId(null);
    setName("");
    setShowModal(true);
  }

  function openEdit(group) {
    setEditingId(group.product_group_id);
    setName(group.product_group_name || "");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name) return;
    setIsSaving(true);

    try {
      // CREATE
      if (!editingId) {
        await fetch("/api/productGroups", {
          method: "POST",
          body: JSON.stringify({ product_group_name: name }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
      // EDIT
      else {
        await fetch(`/api/productGroups/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ product_group_name: name }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      setShowModal(false);
      setName("");
      setEditingId(null);
      fetchData();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGroup(id) {
    try {
      setDeletingId(id);

      const response = await fetch(`/api/productGroups/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro ao eliminar grupo de item");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = groups.filter((g) =>
    (g.product_group_name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Grupos de Itens" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar grupo..."
          className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
        />

        <button
          onClick={openCreate}
          disabled={showModal || isSaving}
          className={`h-11 px-5 rounded-lg ${showModal || isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
        >
          + Criar Grupo
        </button>
      </div>

      {/* TABLE */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Nome</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((group) => (
              <tr
                key={group.product_group_id}
                className="border-t border-gray-100"
              >
                <td className="p-4 text-gray-500">
                  {group.product_group_id}
                </td>

                <td className="p-4 font-medium text-gray-800">
                  {group.product_group_name}
                </td>

                <td className="p-4 text-right flex justify-end gap-2">
                  <button
                    onClick={() => openEdit(group)}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => deleteGroup(group.product_group_id)}
                    disabled={deletingId === group.product_group_id}
                    className={`px-3 py-1 rounded-lg text-sm ${deletingId === group.product_group_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
                  >
                    {deletingId === group.product_group_id ? "Eliminando..." : "Eliminar"}
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
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[350px]">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Editar Grupo" : "Criar Grupo"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do grupo"
                className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
              />

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
                  {isSaving ? (editingId ? "Guardando..." : "Criando...") : editingId ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}