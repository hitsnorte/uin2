"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function PreparationGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function fetchGroups() {
    const response = await fetch("/api/preparationGroups");
    setGroups(await response.json());
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  function openCreate() {
    setEditingId(null);
    setName("");
    setShowModal(true);
  }

  function openEdit(group) {
    setEditingId(group.preparation_group_id);
    setName(group.preparation_group_name || "");
    setShowModal(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await fetch(
        editingId
          ? `/api/preparationGroups/${editingId}`
          : "/api/preparationGroups",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preparation_group_name: name.trim() }),
        }
      );
      setShowModal(false);
      await fetchGroups();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGroup(id) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/preparationGroups/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      await fetchGroups();
    } catch (error) {
      console.error(error);
      alert("Erro ao eliminar grupo de preparação");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = groups.filter((group) =>
    (group.preparation_group_name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6"><Topbar title="Grupos de preparação" /></div>
      <div className="flex items-center justify-between my-6">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar grupo..." className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none" />
        <button onClick={openCreate} disabled={showModal || isSaving} className={`h-11 px-5 rounded-lg ${showModal || isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}>+ Criar Grupo</button>
      </div>
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600"><tr><th className="p-4">ID</th><th className="p-4">Nome</th><th className="p-4 text-right">Ações</th></tr></thead>
          <tbody>{filtered.map((group) => <tr key={group.preparation_group_id} className="border-t border-gray-100">
            <td className="p-4 text-gray-500">{group.preparation_group_id}</td>
            <td className="p-4 font-medium text-gray-800">{group.preparation_group_name || "-"}</td>
            <td className="p-4 text-right"><div className="flex justify-end gap-2">
              <button onClick={() => openEdit(group)} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">Editar</button>
              <button onClick={() => deleteGroup(group.preparation_group_id)} disabled={deletingId === group.preparation_group_id} className={`px-3 py-1 rounded-lg text-sm ${deletingId === group.preparation_group_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}>{deletingId === group.preparation_group_id ? "Eliminando..." : "Eliminar"}</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {showModal && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">{editingId ? "Editar Grupo" : "Criar Grupo"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do grupo" required className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none" />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} disabled={isSaving} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancelar</button><button type="submit" disabled={isSaving} className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500" : "bg-red-500 hover:bg-red-600 text-white"}`}>{isSaving ? "A guardar..." : editingId ? "Guardar" : "Criar"}</button></div>
        </form>
      </div></div>}
    </div>
  );
}
