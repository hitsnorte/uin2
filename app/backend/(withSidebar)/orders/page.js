"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import {
  TbChevronLeft,
  TbChevronRight,
  TbChevronsLeft,
  TbChevronsRight,
  TbListDetails,
  TbListNumbers,
  TbRefresh,
  TbSearch,
} from "react-icons/tb";
import { FaRegTrashAlt } from "react-icons/fa";
import { FaPencilAlt } from "react-icons/fa";

function getLocalDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOutletName(outlet) {
  if (!outlet) return "—";

  return (
    outlet?.outlet_name1 ||
    outlet?.outlet_name2 ||
    outlet?.outlet_name3 ||
    outlet?.outlet_name4 ||
    outlet?.outlet_name5 ||
    `Outlet ${outlet?.outlet_id}`
  );
}

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

function formatPrice(value) {
  if (value == null || value === "") return "—";

  const price = Number(value);
  return Number.isFinite(price)
    ? new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
      }).format(price)
    : "—";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [dateDefaults] = useState(() => ({
    startDate: getLocalDateString(),
    endDate: getLocalDateString(1),
  }));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [outletFilter, setOutletFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [startDate, setStartDate] = useState(dateDefaults.startDate);
  const [endDate, setEndDate] = useState(dateDefaults.endDate);
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
      if (
        !Array.isArray(data?.orders) ||
        !Array.isArray(data?.statuses) ||
        !Array.isArray(data?.outlets)
      ) {
        throw new Error("Os dados dos pedidos recebidos são inválidos.");
      }

      setOrders(data.orders);
      setStatuses(data.statuses);
      setOutlets(data.outlets);
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

  const outletsById = useMemo(
    () => new Map(outlets.map((outlet) => [String(outlet.outlet_id), outlet])),
    [outlets]
  );

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
    const normalize = (value) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-PT");
    const normalizedSearch = normalize(search.trim());
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    return orders.filter((order) => {
      const orderDate = order.created_at ? new Date(order.created_at) : null;
      const orderStatusId =
        order.order_status ?? order.OrderStatus?.order_status_id;
      const outlet = outletsById.get(String(order.outlet_id ?? ""));

      if (statusFilter && String(orderStatusId ?? "") !== statusFilter) {
        return false;
      }
      if (outletFilter && String(order.outlet_id ?? "") !== outletFilter) {
        return false;
      }
      if (
        start &&
        (!orderDate ||
          Number.isNaN(orderDate.getTime()) ||
          orderDate < start)
      ) {
        return false;
      }
      if (
        end &&
        (!orderDate ||
          Number.isNaN(orderDate.getTime()) ||
          orderDate > end)
      ) {
        return false;
      }
      if (!normalizedSearch) return true;

      return normalize(
        [
          order.order_id,
          order.order_name,
          order.customer_name,
          getOutletName(outlet),
          formatDate(order.created_at),
          order.created_at,
          order.OrderStatus?.order_status_name,
        ].join(" ")
      ).includes(normalizedSearch);
    });
  }, [
    orders,
    outletsById,
    search,
    statusFilter,
    outletFilter,
    startDate,
    endDate,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const pageWindowStart = Math.max(
    1,
    Math.min(currentPage - 2, pageCount - 4)
  );
  const pageNumbers = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => pageWindowStart + index
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, outletFilter, startDate, endDate]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      statusFilter ||
      outletFilter ||
      startDate !== dateDefaults.startDate ||
      endDate !== dateDefaults.endDate
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="-mx-6 -mt-6">
        <Topbar title="Pedidos" />
      </div>

      <div className="my-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="orders-search"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Pesquisar pedidos
            </label>
            <div className="relative">
              <TbSearch
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                id="orders-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ID, pedido, cliente, data ou estado..."
                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="w-full lg:w-48">
            <label
              htmlFor="orders-status-filter"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Estado
            </label>
            <select
              id="orders-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todos os estados</option>
              {statuses.map((status) => (
                <option
                  key={status.order_status_id}
                  value={status.order_status_id}
                >
                  {status.order_status_name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-48">
            <label
              htmlFor="orders-outlet-filter"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Outlet
            </label>
            <select
              id="orders-outlet-filter"
              value={outletFilter}
              onChange={(event) => setOutletFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todos os outlets</option>
              {outlets.map((outlet) => (
                <option key={outlet.outlet_id} value={outlet.outlet_id}>
                  {getOutletName(outlet)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[340px]">
            <div>
              <label
                htmlFor="orders-start-date"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Desde
              </label>
              <input
                id="orders-start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label
                htmlFor="orders-end-date"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Até
              </label>
              <input
                id="orders-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setOutletFilter("");
                  setStartDate(dateDefaults.startDate);
                  setEndDate(dateDefaults.endDate);
                }}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaRegTrashAlt size={18} color="red" />
              </button>
            )}
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              aria-label="Atualizar pedidos"
              title="Atualizar pedidos"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TbRefresh size={18} />
            </button>
          </div>
        </div>
        <p aria-live="polite" className="mt-3 text-sm text-gray-500">
          {filteredOrders.length} de {orders.length} pedidos
        </p>
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
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Pedido</th>
              <th className="p-4">Preço total</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Outlet</th>
              <th className="p-4">Data</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  A carregar pedidos...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  {orders.length === 0
                    ? "Ainda não existem pedidos."
                    : "Nenhum pedido corresponde aos filtros aplicados."}
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => (
                <tr key={order.order_id} className="border-t border-gray-100">
                  <td className="p-4 text-gray-500">{order.order_id}</td>
                  <td className="p-4 font-medium text-gray-800">
                    {order.quantity > 1 ? `${order.quantity} × ` : ""}
                    {order.order_name || "—"}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-700">
                    {formatPrice(order.price)}
                  </td>
                  <td className="p-4 text-gray-700">
                    {order.customer_name || "—"}
                  </td>
                  <td className="p-4 text-gray-700">
                    {getOutletName(
                      outletsById.get(String(order.outlet_id ?? ""))
                    )}
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

      <div
        className="fixed bottom-0 z-30 border-t border-gray-200 bg-white/95 px-6 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
        style={{
          left: "var(--sidebar-width)",
          width: "calc(100vw - var(--sidebar-width))",
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TbListDetails aria-hidden="true" size={18} className="shrink-0 text-gray-400" />
            <span aria-live="polite">
              {filteredOrders.length === 0
                ? "A mostrar 0 pedidos"
                : `A mostrar ${(currentPage - 1) * pageSize + 1}-${Math.min(
                    currentPage * pageSize,
                    filteredOrders.length
                  )} de ${filteredOrders.length} pedidos`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="orders-page-size"
              className="flex items-center gap-1.5 text-sm text-gray-700"
            >
              <TbListNumbers aria-hidden="true" size={17} className="text-gray-500" />
              Por página
            </label>
            <select
              id="orders-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              {[15, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="mx-1 hidden text-sm text-gray-500 sm:inline">
              Página {currentPage} de {pageCount}
            </span>
            <div className="flex items-center gap-1" aria-label="Paginação">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                aria-label="Primeira página"
                title="Primeira página"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TbChevronsLeft aria-hidden="true" size={18} />
              </button>
              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                title="Página anterior"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TbChevronLeft aria-hidden="true" size={18} />
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  aria-label={`Página ${pageNumber}`}
                  aria-current={currentPage === pageNumber ? "page" : undefined}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium ${
                    currentPage === pageNumber
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={currentPage === pageCount}
                aria-label="Página seguinte"
                title="Página seguinte"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TbChevronRight aria-hidden="true" size={18} />
              </button>
              <button
                type="button"
                onClick={() => setPage(pageCount)}
                disabled={currentPage === pageCount}
                aria-label="Última página"
                title="Última página"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TbChevronsRight aria-hidden="true" size={18} />
              </button>
            </div>
          </div>
        </div>
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
