"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

const emptyForm = {
  preparation_name1: "",
  preparation_name2: "",
  preparation_name3: "",
  preparation_name4: "",
  preparation_name5: "",
};

export default function PreparationPage() {
  const [preparations, setPreparations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [groupId, setGroupId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function fetchData() {
    const [preparationsResponse, groupsResponse, languagesResponse] = await Promise.all([
      fetch("/api/preparation"),
      fetch("/api/preparationGroups"),
      fetch("/api/languages"),
    ]);
    setPreparations(await preparationsResponse.json());
    setGroups(await groupsResponse.json());
    const languageData = await languagesResponse.json();
    setLanguages(languageData.sort((a, b) => (a.lang_order || 0) - (b.lang_order || 0)));
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setGroupId("");
    setShowModal(true);
  }

  function openEdit(preparation) {
    setEditingId(preparation.preparation_id);
    setGroupId(preparation.preparation_group_id ? String(preparation.preparation_group_id) : "");
    setForm({
      preparation_name1: preparation.preparation_name1 || "",
      preparation_name2: preparation.preparation_name2 || "",
      preparation_name3: preparation.preparation_name3 || "",
      preparation_name4: preparation.preparation_name4 || "",
      preparation_name5: preparation.preparation_name5 || "",
    });
    setShowModal(true);
  }

  function handleChange(event) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.preparation_name1.trim()) return;

    setIsSaving(true);
    try {
      await fetch(editingId ? `/api/preparation/${editingId}` : "/api/preparation", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          preparation_group_id: groupId ? Number(groupId) : null,
        }),
      });
      setShowModal(false);
      await fetchData();
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePreparation(id) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/preparation/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Erro ao eliminar preparação");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = preparations.filter((preparation) =>
    languages.some((language) =>
      (preparation[`preparation_name${language.lang_order}`] || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    ) || (preparation.preparation_name1 || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6"><Topbar title="Preparações" /></div>
      <div className="flex items-center justify-between my-6">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar preparação..." className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none" />
        <button onClick={openCreate} disabled={showModal || isSaving} className={`h-11 px-5 rounded-lg ${showModal || isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}>+ Criar Preparação</button>
      </div>
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600"><tr><th className="p-4">ID</th>{languages.length ? languages.map((language) => <th key={language.lang_id} className="p-4">{language.lang_name}</th>) : <th className="p-4">Nome</th>}<th className="p-4">Grupo</th><th className="p-4 text-right">Ações</th></tr></thead>
          <tbody>{filtered.map((preparation) => { const group = groups.find((item) => item.preparation_group_id === preparation.preparation_group_id); return <tr key={preparation.preparation_id} className="border-t border-gray-100">
            <td className="p-4 text-gray-500">{preparation.preparation_id}</td>
            {languages.length ? languages.map((language) => <td key={language.lang_id} className="p-4 font-medium text-gray-800">{preparation[`preparation_name${language.lang_order}`] || "-"}</td>) : <td className="p-4 font-medium text-gray-800">{preparation.preparation_name1 || "-"}</td>}
            <td className="p-4 text-gray-600">{group?.preparation_group_name || "-"}</td>
            <td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => openEdit(preparation)} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">Editar</button><button onClick={() => deletePreparation(preparation.preparation_id)} disabled={deletingId === preparation.preparation_id} className={`px-3 py-1 rounded-lg text-sm ${deletingId === preparation.preparation_id ? "bg-gray-300 text-gray-500" : "bg-red-500 hover:bg-red-600 text-white"}`}>{deletingId === preparation.preparation_id ? "Eliminando..." : "Eliminar"}</button></div></td>
          </tr>; })}</tbody>
        </table>
      </div>
      {showModal && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-semibold">{editingId ? "Editar Preparação" : "Criar Preparação"}</h2><button type="button" onClick={() => setShowModal(false)} disabled={isSaving} className="text-gray-400 hover:text-gray-600">✕</button></div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div><p className="text-sm font-semibold text-gray-600 mb-3">Nomes</p>{languages.length ? languages.map((language) => { const field = `preparation_name${language.lang_order}`; return <input key={language.lang_id} name={field} value={form[field] || ""} onChange={handleChange} placeholder={`Nome (${language.lang_name})`} className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none mb-2" />; }) : <input name="preparation_name1" value={form.preparation_name1} onChange={handleChange} placeholder="Nome da preparação" className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none" />}</div>
          <div><p className="text-sm font-semibold text-gray-600 mb-3">Grupo</p><select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full h-11 border border-gray-300 rounded-lg px-3 bg-white focus:border-red-500 outline-none"><option value="">Sem grupo</option>{groups.map((group) => <option key={group.preparation_group_id} value={group.preparation_group_id}>{group.preparation_group_name || "-"}</option>)}</select></div>
          <div className="flex justify-end gap-2 border-t pt-5"><button type="button" onClick={() => setShowModal(false)} disabled={isSaving} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancelar</button><button type="submit" disabled={isSaving} className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500" : "bg-red-500 hover:bg-red-600 text-white"}`}>{isSaving ? "A guardar..." : editingId ? "Guardar" : "Criar"}</button></div>
        </form>
      </div></div>}
    </div>
  );
}
