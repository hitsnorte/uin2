"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

const emptyForm = {
  name: "",
  rate: "",
  country_code: "PT",
};

async function getErrorMessage(response, fallback) {
  const result = await response.json().catch(() => null);
  return result?.error || fallback;
}

export default function IvaRatesPage() {
  const [rates, setRates] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function fetchRates() {
    const response = await fetch("/api/ivaRates");

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Não foi possível carregar as taxas de IVA."));
    }

    setRates(await response.json());
  }

  useEffect(() => {
    async function loadRates() {
      try {
        await fetchRates();
      } catch (loadError) {
        console.error(loadError);
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadRates();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  }

  function openEdit(rate) {
    setEditingId(rate.iva_id);
    setForm({
      name: rate.name || "",
      rate: String(rate.rate ?? ""),
      country_code: rate.country_code || "",
    });
    setError("");
    setShowModal(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "country_code" ? value.toUpperCase() : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        editingId ? `/api/ivaRates/${editingId}` : "/api/ivaRates",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Não foi possível guardar a taxa de IVA."));
      }

      await fetchRates();
      setShowModal(false);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function removeRate(id) {
    if (!window.confirm("Tem a certeza de que pretende eliminar esta taxa de IVA?")) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      const response = await fetch(`/api/ivaRates/${id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Não foi possível eliminar a taxa de IVA."));
      }

      await fetchRates();
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRates = rates.filter((rate) =>
    [rate.name, rate.country_code, String(rate.rate)]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Taxas de IVA" />
      </div>

      <div className="my-6 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar taxa de IVA..."
          className="h-11 w-80 max-w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
        />

        <button
          onClick={openCreate}
          className="h-11 shrink-0 rounded-lg bg-red-500 px-5 text-white hover:bg-red-600"
        >
          + Criar Taxa
        </button>
      </div>

      {error && !showModal && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Nome</th>
              <th className="p-4">Taxa</th>
              <th className="p-4">País</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">A carregar taxas...</td>
              </tr>
            ) : filteredRates.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  {search ? "Nenhuma taxa encontrada." : "Ainda não existem taxas de IVA."}
                </td>
              </tr>
            ) : (
              filteredRates.map((rate) => (
                <tr key={rate.iva_id} className="border-t border-gray-100">
                  <td className="p-4 text-gray-500">{rate.iva_id}</td>
                  <td className="p-4 font-medium text-gray-800">{rate.name}</td>
                  <td className="p-4">
                    {Number(rate.rate).toLocaleString("pt-PT", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    %
                  </td>
                  <td className="p-4">{rate.country_code || "—"}</td>
                  <td className="flex justify-end gap-2 p-4">
                    <button
                      onClick={() => openEdit(rate)}
                      className="rounded-lg bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => removeRate(rate.iva_id)}
                      disabled={deletingId === rate.iva_id}
                      className={`rounded-lg px-3 py-1 text-sm ${
                        deletingId === rate.iva_id
                          ? "cursor-not-allowed bg-gray-300 text-gray-500"
                          : "bg-red-500 text-white hover:bg-red-600"
                      }`}
                    >
                      {deletingId === rate.iva_id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">
              {editingId ? "Editar Taxa de IVA" : "Criar Taxa de IVA"}
            </h2>

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Nome
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                maxLength={100}
                required
                className="h-11 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-red-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Taxa (%)
              <input
                type="number"
                name="rate"
                value={form.rate}
                onChange={handleChange}
                min="0"
                max="999.99"
                step="0.01"
                required
                className="h-11 rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-red-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Código do país
              <input
                name="country_code"
                value={form.country_code}
                onChange={handleChange}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                title="Introduza um código de país com duas letras."
                className="h-11 rounded-lg border border-gray-300 px-3 font-normal uppercase outline-none focus:border-red-500"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
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
