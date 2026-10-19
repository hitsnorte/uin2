
"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

const emptyForm = {
    access_point_name: "",
    products: "",
    product_cat: "",
    activities: "",
    active: true
};

export default function AccessPointsPage() {
    const [points, setPoints] = useState([]);
    const [subGroups, setSubGroups] = useState([]);
    const [groups, setGroups] = useState([]);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [subGroupId, setSubGroupId] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    async function fetchData() {
        const [
            pointsResponse,
            subGroupsResponse,
            groupsResponse
        ] = await Promise.all([
            fetch("/api/accessPoints"),
            fetch("/api/accessPointSubGroups"),
            fetch("/api/accessPointGroups")
        ]);

        setPoints(await pointsResponse.json());
        setSubGroups(await subGroupsResponse.json());
        setGroups(await groupsResponse.json());
    }

    useEffect(() => {
        fetchData();
    }, []);

    function openCreate() {
        setEditingId(null);
        setForm({
            ...emptyForm
        });
        setSubGroupId("");
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
        setSubGroupId(
            point.access_point_sub_group_id
                ? String(point.access_point_sub_group_id)
                : ""
        );

        setForm({
            access_point_name: point.access_point_name || "",
            products: toText(point.products),
            product_cat: toText(point.product_cat),
            activities: toText(point.activities),
            active: point.active !== false
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

        if (!form.access_point_name.trim() || !subGroupId) return;

        setIsSaving(true);

        try {
            await fetch(
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
                        access_point_sub_group_id: Number(subGroupId)
                    })
                }
            );

            setShowModal(false);
            await fetchData();
        } catch (error) {
            console.error(error);
            alert("JSON inválido nos campos de configuração");
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
                            <th className="p-4">Subgrupo</th>
                            <th className="p-4">Grupo</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((point) => {
                            const subGroup = subGroups.find(
                                (item) =>
                                    item.access_point_sub_group_id ===
                                    point.access_point_sub_group_id
                            );

                            const group = groups.find(
                                (item) =>
                                    item.access_point_group_id ===
                                    subGroup?.access_point_group_id
                            );

                            return (
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
                                        {subGroup?.access_point_group_name || "-"}
                                    </td>

                                    <td className="p-4 text-gray-600">
                                        {group?.access_point_group_name || "-"}
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
                            );
                        })}
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
                                value={subGroupId}
                                onChange={(event) =>
                                    setSubGroupId(event.target.value)
                                }
                                required
                                className="h-11 border border-gray-300 rounded-lg px-3 bg-white focus:border-red-500 outline-none"
                            >
                                <option value="">
                                    Selecionar subgrupo
                                </option>

                                {subGroups.map((subGroup) => {
                                    const group = groups.find(
                                        (item) =>
                                            item.access_point_group_id ===
                                            subGroup.access_point_group_id
                                    );

                                    return (
                                        <option
                                            key={
                                                subGroup.access_point_sub_group_id
                                            }
                                            value={
                                                subGroup.access_point_sub_group_id
                                            }
                                        >
                                            {group?.access_point_group_name ||
                                                "-"}{" "}
                                            /{" "}
                                            {subGroup.access_point_group_name ||
                                                "-"}
                                        </option>
                                    );
                                })}
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
