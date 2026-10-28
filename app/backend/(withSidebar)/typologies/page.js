"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";

async function readResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}

export default function TypologiesPage() {
  const [typologies, setTypologies] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", outlet_id: "", seats: "" });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function fetchData() {
    setIsLoading(true);
    setError("");

    try {
      const [typologiesResponse, outletsResponse] = await Promise.all([
        fetch("/api/typologies"),
        fetch("/api/outlets"),
      ]);
      const [typologiesData, outletsData] = await Promise.all([
        readResponse(typologiesResponse, "Não foi possível carregar as tipologias."),
        readResponse(outletsResponse, "Não foi possível carregar os outlets."),
      ]);

      setTypologies(typologiesData);
      setOutlets(outletsData);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError.message || "Erro ao carregar os dados.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTypologies = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return typologies;

    return typologies.filter(
      (typology) =>
        typology.name.toLocaleLowerCase().includes(normalizedSearch) ||
        (typology.outlet_name || "").toLocaleLowerCase().includes(normalizedSearch)
    );
  }, [search, typologies]);

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", outlet_id: "", seats: "" });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(typology) {
    setEditingId(typology.typology_id);
    setForm({
      name: typology.name,
      outlet_id: String(typology.outlet_id),
      seats: typology.seats == null ? "" : String(typology.seats),
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setFormError("");

    try {
      const response = await fetch(
        editingId ? `/api/typologies/${editingId}` : "/api/typologies",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            outlet_id: form.outlet_id,
            seats: form.seats,
          }),
        }
      );
      const result = await readResponse(
        response,
        editingId
          ? "Não foi possível guardar a tipologia."
          : "Não foi possível criar a tipologia."
      );

      setTypologies((current) =>
        (editingId
          ? current.map((typology) =>
              typology.typology_id === result.typology_id ? result : typology
            )
          : [...current, result]
        ).sort(
          (a, b) =>
            a.outlet_id - b.outlet_id || a.name.localeCompare(b.name)
        )
      );
      setShowModal(false);
      setForm({ name: "", outlet_id: "", seats: "" });
    } catch (saveError) {
      console.error(saveError);
      setFormError(saveError.message || "Erro ao criar a tipologia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Tipologias" />
      </div>

      <div className="my-6 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar tipologias..."
          aria-label="Pesquisar tipologias"
          className="h-11 w-80 max-w-full rounded-lg border border-gray-300 bg-white px-3 outline-none focus:border-red-500"
        />

        <button
          type="button"
          onClick={openCreate}
          disabled={showModal || isSaving || outlets.length === 0}
          className={`h-11 shrink-0 rounded-lg px-5 ${
            showModal || isSaving || outlets.length === 0
              ? "cursor-not-allowed bg-gray-300 text-gray-500"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
        >
          + Criar Tipologia
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchData}
            className="font-semibold underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {outlets.length === 0 && !isLoading && !error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Crie um outlet antes de adicionar tipologias.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Tipologia</th>
                <th className="p-4">Lugares</th>
                <th className="p-4">Outlet</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={5}>
                    A carregar tipologias...
                  </td>
                </tr>
              ) : filteredTypologies.length ? (
                filteredTypologies.map((typology) => (
                  <tr key={typology.typology_id} className="border-t">
                    <td className="p-4">{typology.typology_id}</td>
                    <td className="p-4">{typology.name}</td>
                    <td className="p-4">{typology.seats ?? "Por definir"}</td>
                    <td className="p-4">
                      {typology.outlet_name || `Outlet ${typology.outlet_id}`}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(typology)}
                        className="rounded-lg bg-gray-200 px-3 py-1 hover:bg-gray-300"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={5}>
                    {search
                      ? "Nenhuma tipologia corresponde à pesquisa."
                      : "Ainda não existem tipologias."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6"
          >
            <h2 className="text-lg font-semibold">
              {editingId ? "Editar Tipologia" : "Criar Tipologia"}
            </h2>

            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="typology-name" className="text-xs font-bold text-gray-500">
                Nome
              </label>
              <input
                id="typology-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                maxLength={100}
                required
                className="h-10 rounded-lg border px-3"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="typology-seats" className="text-xs font-bold text-gray-500">
                Número de lugares
              </label>
              <input
                id="typology-seats"
                type="number"
                min="1"
                step="1"
                value={form.seats}
                onChange={(event) =>
                  setForm((current) => ({ ...current, seats: event.target.value }))
                }
                required
                className="h-10 rounded-lg border px-3"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="typology-outlet" className="text-xs font-bold text-gray-500">
                Outlet
              </label>
              <select
                id="typology-outlet"
                value={form.outlet_id}
                disabled={Boolean(editingId)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    outlet_id: event.target.value,
                  }))
                }
                required
                className="h-10 rounded-lg border px-2"
              >
                <option value="">Selecionar outlet</option>
                {outlets.map((outlet) => (
                  <option key={outlet.outlet_id} value={outlet.outlet_id}>
                    {outlet.outlet_name1 || `Outlet ${outlet.outlet_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="rounded-lg bg-gray-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isSaving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}