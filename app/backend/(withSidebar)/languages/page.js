"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function LanguagesPage() {
  const [languages, setLanguages] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");

  const [editingId, setEditingId] = useState(null);

  async function fetchData() {
    const res = await fetch("/api/languages");
    const data = await res.json();
    setLanguages(data);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreate() {
    if (languages.length >= 5) {
      alert("Limite máximo de 5 linguagens atingido.");
      return;
    }

    setEditingId(null);
    setName("");
    setShowModal(true);
  }

  function openEdit(lang) {
    setEditingId(lang.lang_id);
    setName(lang.lang_name);
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name) return;

    // CREATE
    if (!editingId) {
      if (languages.length >= 5) {
        alert("Limite máximo de 5 linguagens atingido.");
        return;
      }

      await fetch("/api/languages", {
        method: "POST",
        body: JSON.stringify({ lang_name: name }),
      });
    }

    // EDIT
    else {
      await fetch(`/api/languages/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ lang_name: name }),
      });
    }

    setShowModal(false);
    setName("");
    setEditingId(null);
    fetchData();
  }

  async function deleteLanguage(id) {
    await fetch(`/api/languages/${id}`, {
      method: "DELETE",
    });

    fetchData();
  }

  const filtered = languages.filter((l) =>
    l.lang_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="-mx-6 -mt-6">
        <Topbar title="Linguagens" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">


        {/* SEARCH */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar linguagem..."
          className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
        />

        {/* CREATE */}
        <button
          onClick={openCreate}
          className="h-11 px-5 bg-red-500 hover:bg-red-600 text-white rounded-lg"
        >
          + Criar Linguagem
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
            {filtered.map((lang) => (
              <tr key={lang.lang_id} className="border-t border-gray-100">

                <td className="p-4 text-gray-500">
                  {lang.lang_id}
                </td>

                <td className="p-4 font-medium text-gray-800">
                  {lang.lang_name}
                </td>

                <td className="p-4 text-right flex justify-end gap-2">

                  {/* EDIT */}
                  <button
                    onClick={() => openEdit(lang)}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                  >
                    Editar
                  </button>

                  {/* DELETE */}
                  <button
                    onClick={() => deleteLanguage(lang.lang_id)}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                  >
                    Eliminar
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
              {editingId ? "Editar Linguagem" : "Criar Linguagem"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da linguagem"
                className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
              />

              <div className="flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                >
                  {editingId ? "Guardar" : "Criar"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}