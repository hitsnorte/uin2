"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function AccessPointSubGroupsPage() {
    const [subGroups, setSubGroups] = useState([]);
    const [groups, setGroups] = useState([]);
    const [search, setSearch] = useState("");
    const [name, setName] = useState("");
    const [groupId, setGroupId] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    async function fetchData() {
        const [
            subGroupsResponse,
            groupsResponse
        ] = await Promise.all([
            fetch("/api/accessPointSubGroups"),
            fetch("/api/accessPointGroups")
        ]);

        setSubGroups(await subGroupsResponse.json());
        setGroups(await groupsResponse.json());
    }

    useEffect(() => {
        fetchData();
    }, []);

    function openCreate() {
        setEditingId(null);
        setName("");
        setGroupId("");
        setShowModal(true);
    }

    function openEdit(subGroup) {
        setEditingId(subGroup.access_point_sub_group_id);
        setName(subGroup.access_point_group_name || "");
        setGroupId(
            subGroup.access_point_group_id
                ? String(subGroup.access_point_group_id)
                : ""
        );
        setShowModal(true);
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!name.trim() || !groupId) return;

        setIsSaving(true);

        try {
            await fetch(
                editingId
                    ? `/api/accessPointSubGroups/${editingId}`
                    : "/api/accessPointSubGroups",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        access_point_group_id: Number(groupId),
                        access_point_group_name: name.trim()
                    })
                }
            );

            setShowModal(false);
            await fetchData();
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteSubGroup(id) {
        setDeletingId(id);

        try {
            const response = await fetch(
                `/api/accessPointSubGroups/${id}`,
                {
                    method: "DELETE"
                }
            );

            if (!response.ok) throw new Error("Delete failed");

            await fetchData();
        } catch (error) {
            console.error(error);
            alert("Erro ao eliminar subgrupo de pontos de acesso");
        } finally {
            setDeletingId(null);
        }
    }

    const filtered = subGroups.filter((subGroup) =>
        (subGroup.access_point_group_name || "")
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="-mx-6 -mt-6">
                <Topbar title="Subgrupos de pontos de acesso" />
            </div>

            <div className="flex items-center justify-between my-6">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar subgrupo..."
                    className="h-11 w-72 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                />

                <button
                    onClick={openCreate}
                    disabled={showModal || isSaving}
                    className={`h-11 px-5 rounded-lg ${
                        showModal || isSaving
                            ? "bg-gray-300 text-gray-500"
                            : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                >
                    + Criar Subgrupo
                </button>
            </div>

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
                        {filtered.map((subGroup) => {
                            const group = groups.find(
                                (item) =>
                                    item.access_point_group_id ===
                                    subGroup.access_point_group_id
                            );

                            return (
                                <tr
                                    key={
                                        subGroup.access_point_sub_group_id
                                    }
                                    className="border-t border-gray-100"
                                >
                                    <td className="p-4 text-gray-500">
                                        {subGroup.access_point_sub_group_id}
                                    </td>

                                    <td className="p-4 font-medium text-gray-800">
                                        {subGroup.access_point_group_name || "-"}
                                    </td>

                                    <td className="p-4 text-gray-600">
                                        {group?.access_point_group_name || "-"}
                                    </td>

                                    <td className="p-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() =>
                                                    openEdit(subGroup)
                                                }
                                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg"
                                            >
                                                Editar
                                            </button>

                                            <button
                                                onClick={() =>
                                                    deleteSubGroup(
                                                        subGroup.access_point_sub_group_id
                                                    )
                                                }
                                                disabled={
                                                    deletingId ===
                                                    subGroup.access_point_sub_group_id
                                                }
                                                className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                                            >
                                                {deletingId ===
                                                subGroup.access_point_sub_group_id
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
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h2 className="text-lg font-semibold mb-4">
                            {editingId
                                ? "Editar Subgrupo"
                                : "Criar Subgrupo"}
                        </h2>

                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-4"
                        >
                            <input
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder="Nome do subgrupo"
                                required
                                className="h-11 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none"
                            />

                            <select
                                value={groupId}
                                onChange={(event) =>
                                    setGroupId(event.target.value)
                                }
                                required
                                className="h-11 border border-gray-300 rounded-lg px-3 bg-white focus:border-red-500 outline-none"
                            >
                                <option value="">
                                    Selecionar grupo
                                </option>

                                {groups.map((group) => (
                                    <option
                                        key={group.access_point_group_id}
                                        value={group.access_point_group_id}
                                    >
                                        {group.access_point_group_name || "-"}
                                    </option>
                                ))}
                            </select>

                            <div className="flex justify-end gap-2">
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