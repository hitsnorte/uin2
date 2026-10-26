
"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

const emptyForm = {
    access_point_name: "",
    products: "",
    product_cat: "",
    activities: "",
    active: true,
    typology_id: ""
};

export default function AccessPointsPage() {
    const [points, setPoints] = useState([]);
    const [typologies, setTypologies] = useState([]);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    async function fetchData() {
        const [pointsResponse, typologiesResponse] = await Promise.all([
            fetch("/api/accessPoints"),
            fetch("/api/typologies")
        ]);
        if (!pointsResponse.ok || !typologiesResponse.ok) {
            throw new Error("Não foi possível carregar os pontos de acesso e tipologias.");
        }
        const [pointsData, typologiesData] = await Promise.all([
            pointsResponse.json(),
            typologiesResponse.json()
        ]);
        setPoints(pointsData);
        setTypologies(typologiesData);
    }

    useEffect(() => {
        fetchData().catch((error) => {
            console.error(error);
            alert(error.message || "Erro ao carregar pontos de acesso.");
        });
    }, []);

    function openCreate() {
        setEditingId(null);
        setForm({
            ...emptyForm
        });
        setShowModal(true);
    }

    function toText(value) {
        return value == null
            ? ""
            : typeof value === "string"
                ? value
                : JSON.stringify(value, null, 2);
    }

    function openEdit(point) {
        setEditingId(point.access_point_id);
        setForm({
            access_point_name: point.access_point_name || "",
            products: toText(point.products),
            product_cat: toText(point.product_cat),
            activities: toText(point.activities),
            active: point.active !== false,
            typology_id: point.typology_id == null ? "" : String(point.typology_id)
        });

        setShowModal(true);
    }

    function handleChange(event) {
        const {
            name,
            value,
            type,
            checked
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form.access_point_name.trim() || !form.typology_id) return;

        setIsSaving(true);

        try {
            const response = await fetch(
                editingId
                    ? `/api/accessPoints/${editingId}`
                    : "/api/accessPoints",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        ...form,
                        typology_id: Number(form.typology_id)
                    })
                }
            );

            if (!response.ok) {
                const result = await response.json().catch(() => null);
                throw new Error(result?.error || "Não foi possível guardar o ponto de acesso.");
            }

            setShowModal(false);
            await fetchData();
        } catch (error) {
            console.error(error);
            alert(error.message || "Não foi possível guardar o ponto de acesso.");
        } finally {
            setIsSaving(false);
        }
    }

    async function deletePoint(id) {
        setDeletingId(id);

        try {
            const response = await fetch(`/api/accessPoints/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) throw new Error("Delete failed");

            await fetchData();
        } catch (error) {
            console.error(error);
            alert("Erro ao eliminar ponto de acesso");
        } finally {
            setDeletingId(null);
        }
    }

    const filtered = points.filter((point) =>
        (point.access_point_name || "")
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="-mx-6 -mt-6">
                <Topbar title="Pontos de acesso" />
            </div>

            <div className="flex items-center justify-between my-6">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar ponto..."
                    className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                />

                <button
                    onClick={openCreate}
                    disabled={showModal || isSaving}
                    className={`h-11 px-5 rounded-lg ${showModal || isSaving
                            ? "bg-gray-300 text-gray-500"
                            : "bg-red-500 hover:bg-red-600 text-white"
                        }`}
                >
                    +Criar Ponto
                </button>
            </div>

            <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-left text-gray-600">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Tipologia</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((point) => (
                                <tr
                                    key={point.access_point_id}
                                    className="border-t border-gray-100"
                                >
                                    <td className="p-4 text-gray-500">
                                        {point.access_point_id}
                                    </td>

                                    <td className="p-4 font-medium text-gray-800">
                                        {point.access_point_name || "-"}
                                    </td>

                                    <td className="p-4 text-gray-600">
                                        {typologies.find(
                                            (typology) =>
                                                typology.typology_id === String(point.typology_id)
                                        )?.name || "-"}
                                    </td>

                                    <td className="p-4 text-gray-600">
                                        {point.active === false
                                            ? "Inativo"
                                            : "Ativo"}
                                    </td>

                                    <td className="p-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(point)}
                                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg"
                                            >
                                                Editar
                                            </button>

                                            <button
                                                onClick={() =>
                                                    deletePoint(
                                                        point.access_point_id
                                                    )
                                                }
                                                disabled={
                                                    deletingId ===
                                                    point.access_point_id
                                                }
                                                className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                                            >
                                                {deletingId ===
                                                    point.access_point_id
                                                    ? "Eliminando..."
                                                    : "Eliminar"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold">
                                {editingId ? "Editar Ponto" : "Criar Ponto"}
                            </h2>

                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                disabled={isSaving}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-4"
                        >
                            <input
                                name="access_point_name"
                                value={form.access_point_name}
                                onChange={handleChange}
                                placeholder="Nome do ponto de acesso"
                                required
                                className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                            />

                            <select
                                name="typology_id"
                                value={form.typology_id}
                                onChange={handleChange}
                                required
                                className="h-11 border border-gray-300 rounded-lg px-3 bg-white focus:border-red-500 outline-none"
                            >
                                <option value="">Selecionar tipologia</option>
                                {typologies.map((typology) => (
                                    <option
                                        key={typology.typology_id}
                                        value={typology.typology_id}
                                    >
                                        {typology.name}
                                    </option>
                                ))}
                            </select>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    name="active"
                                    checked={form.active}
                                    onChange={handleChange}
                                />
                                Ponto ativo
                            </label>

                            {/* {[
                                ["products", "Produtos (JSON)"],
                                [
                                    "product_cat",
                                    "Categorias de produtos (JSON)"
                                ],
                                ["activities", "Atividades (JSON)"]
                            ].map(([field, label]) => (
                                <div key={field}>
                                    <p className="text-sm font-semibold text-gray-600 mb-2">
                                        {label}
                                    </p>

                                    <textarea
                                        name={field}
                                        value={form[field]}
                                        onChange={handleChange}
                                        placeholder="Ex.: []"
                                        rows="3"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:border-red-500 outline-none resize-none"
                                    />
                                </div>
                            ))} */}

                            <div className="flex justify-end gap-2 border-t pt-5">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                                >
                                    {isSaving
                                        ? "A guardar..."
                                        : editingId
                                            ? "Guardar"
                                            : "Criar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
