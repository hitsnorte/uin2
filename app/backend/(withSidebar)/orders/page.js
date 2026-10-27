"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { TbRefresh } from "react-icons/tb";
import { FaPencilAlt } from "react-icons/fa";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [updateError, setUpdateError] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [draftStatusId, setDraftStatusId] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadingError("");
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar os pedidos.");
      }
      if (!Array.isArray(data?.orders) || !Array.isArray(data?.statuses)) {
        throw new Error("Os dados dos pedidos recebidos são inválidos.");
      }

      setOrders(data.orders);
      setStatuses(data.statuses);
    } catch (error) {
      console.error(error);
      setLoadingError(error.message || "Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function openStatusModal(order) {
    setEditingOrder(order);
    setDraftStatusId(String(order.order_status ?? ""));
    setUpdateError("");
  }

  async function updateOrderStatus() {
    if (!editingOrder || !draftStatusId || updatingOrderId !== null) return;

    const orderId = editingOrder.order_id;
    const statusId = draftStatusId;
    const currentOrder = orders.find((order) => order.order_id === orderId);
    if (!currentOrder || Number(currentOrder.order_status) === Number(statusId)) {
      setEditingOrder(null);
      return;
    }

    setUpdatingOrderId(orderId);
    setUpdateError("");
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_status: Number(statusId) }),
      });
      const updatedOrder = await response.json();
      if (!response.ok) {
        throw new Error(updatedOrder?.error || "Não foi possível atualizar o pedido.");
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.order_id === orderId ? updatedOrder : order
        )
      );
      setEditingOrder(null);
    } catch (error) {
      console.error(error);
      setUpdateError(error.message || "Não foi possível atualizar o pedido.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-PT");
    if (!normalizedSearch) return orders;

    return orders.filter((order) =>
      [
        order.order_id,
        order.order_name,
        order.customer_name,
        order.OrderStatus?.order_status_name,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-PT")
        .includes(normalizedSearch)
    );
  }, [orders, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Pedidos" />
      </div>

      <div className="my-6 flex items-center justify-between gap-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar pedidos..."
          aria-label="Pesquisar pedidos"
          className="h-11 w-80 max-w-full rounded-lg border border-gray-300 bg-white px-3 outline-none focus:border-red-500"
        />
        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading}
          className="h-11 rounded-lg bg-gray-200 px-4 text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TbRefresh size={16}/>
        </button>
      </div>

      {loadingError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {loadingError}
        </p>
      )}
      {updateError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {updateError}
        </p>
      )}

      <div className="overflow-x-auto overflow-hidden rounded-2xl border bg-white shadow">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Pedido</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Data</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  A carregar pedidos...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  {orders.length === 0
                    ? "Ainda não existem pedidos."
                    : "Nenhum pedido corresponde à pesquisa."}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.order_id} className="border-t border-gray-100">
                  <td className="p-4 text-gray-500">{order.order_id}</td>
                  <td className="p-4 font-medium text-gray-800">
                    {order.order_name || "—"}
                  </td>
                  <td className="p-4 text-gray-700">
                    {order.customer_name || "—"}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-600">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="p-4 text-gray-700">
                    {order.OrderStatus?.order_status_name || "Sem estado"}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => openStatusModal(order)}
                      disabled={statuses.length === 0 || updatingOrderId !== null}
                      aria-label={`Alterar estado do pedido ${order.order_id}`}
                      title="Alterar estado"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaPencilAlt size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && updatingOrderId === null) {
              setEditingOrder(null);
              setUpdateError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-status-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="order-status-modal-title"
              className="mb-2 text-lg font-semibold text-gray-900"
            >
              Alterar estado do pedido
            </h2>
            <p className="mb-5 text-sm text-gray-600">
              Pedido #{editingOrder.order_id}: {editingOrder.order_name || "—"}
            </p>

            <label
              htmlFor="order-status"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Estado
            </label>
            <select
              id="order-status"
              value={draftStatusId}
              onChange={(event) => setDraftStatusId(event.target.value)}
              disabled={updatingOrderId !== null}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-800 outline-none focus:border-red-500 disabled:bg-gray-100"
            >
              {statuses.map((status) => (
                <option
                  key={status.order_status_id}
                  value={status.order_status_id}
                >
                  {status.order_status_name}
                </option>
              ))}
            </select>

            {updateError && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {updateError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingOrder(null);
                  setUpdateError("");
                }}
                disabled={updatingOrderId !== null}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={updateOrderStatus}
                disabled={
                  updatingOrderId !== null ||
                  !draftStatusId ||
                  Number(editingOrder.order_status) === Number(draftStatusId)
                }
                className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {updatingOrderId === editingOrder.order_id
                  ? "A guardar..."
                  : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
