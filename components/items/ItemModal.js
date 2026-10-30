"use client";

import { useState } from "react";

function isEnabled(value) {
  return value === true || value === 1 || value === "1";
}

export default function ItemModal({
  item,
  shiftOptions = [],
  initialShiftIndex = 0,
  reservationAssignment = false,
  onClose,
  onSaved,
}) {
  const isTableReservation = item.item_type === "Reserva de mesa";
  const isProduct = item.item_type === "Produto";
  const [form, setForm] = useState({
    item_name1: item.item_name1 || "",
    item_description1: item.item_description1 || "",
    item_price: item.item_price ?? "",
    item_vat: item.item_vat ?? "",
    item_duration: item.item_duration ?? "",
    reservation: isEnabled(item.reservation),
    takeaway_order: isEnabled(item.takeaway_order),
    cart: isEnabled(item.cart),
    order: isEnabled(item.order),
    checkin: isEnabled(item.checkin),
    shift_index: String(
      shiftOptions.some((shift) => shift.shift_index === initialShiftIndex)
        ? initialShiftIndex
        : shiftOptions[0]?.shift_index ?? ""
    ),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.item_name1.trim()) {
      setError("Indique o nome do item.");
      return;
    }

    if (
      form.item_price !== "" &&
      (!Number.isFinite(Number(form.item_price)) || Number(form.item_price) < 0)
    ) {
      setError("Indique um preço válido.");
      return;
    }

    if (
      form.item_vat !== "" &&
      (!Number.isFinite(Number(form.item_vat)) ||
        Number(form.item_vat) < 0 ||
        Number(form.item_vat) > 100)
    ) {
      setError("Indique uma percentagem de IVA entre 0 e 100.");
      return;
    }

    if (
      isTableReservation &&
      (!Number.isSafeInteger(Number(form.item_duration)) ||
        Number(form.item_duration) <= 0)
    ) {
      setError("Indique uma duração válida em minutos.");
      return;
    }

    if (
      isTableReservation &&
      reservationAssignment &&
      !shiftOptions.some(
        (shift) => shift.shift_index === Number(form.shift_index)
      )
    ) {
      setError("Selecione um turno válido no horário do outlet.");
      return;
    }

    setIsSaving(true);

    try {
      await onSaved(
        {
          item_id: item.item_id,
          item_name1: form.item_name1.trim(),
          ...(isProduct
            ? { item_description1: form.item_description1.trim() }
            : {}),
          item_price: form.item_price,
          item_vat: form.item_vat,
          ...(isProduct
            ? {
                takeaway_order: form.takeaway_order,
                cart: form.cart,
                order: form.order,
                checkin: form.checkin,
              }
            : {}),
          ...(isTableReservation
            ? {
                item_duration: Number(form.item_duration),
                ...(reservationAssignment
                  ? {
                      reservation: form.reservation,
                      takeaway_order: form.takeaway_order,
                      cart: form.cart,
                      order: form.order,
                      checkin: form.checkin,
                    }
                  : {}),
              }
            : {}),
        },
        reservationAssignment ? Number(form.shift_index) : null
      );
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.message || "Não foi possível guardar o item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        aria-labelledby="item-modal-title"
      >
        <h2 id="item-modal-title" className="mb-5 text-xl font-semibold">
          Editar item
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="item-modal-name" className="text-sm font-medium text-gray-700">
              Nome do item
            </label>
            <input
              id="item-modal-name"
              name="item_name1"
              value={form.item_name1}
              onChange={handleChange}
              maxLength={150}
              required
              disabled={isSaving}
              className="h-10 rounded-lg border px-3"
            />
          </div>

          {isProduct && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="item-modal-description"
                className="text-sm font-medium text-gray-700"
              >
                Descrição
              </label>
              <textarea
                id="item-modal-description"
                name="item_description1"
                value={form.item_description1}
                onChange={handleChange}
                maxLength={150}
                rows={3}
                disabled={isSaving}
                className="rounded-lg border px-3 py-2"
              />
            </div>
          )}

          <div className={reservationAssignment ? "grid grid-cols-2 gap-3" : ""}>
            <div className="flex flex-col gap-1">
              <label htmlFor="item-modal-price" className="text-sm font-medium text-gray-700">
                Preço
              </label>
              <input
                id="item-modal-price"
                name="item_price"
                type="number"
                min="0"
                step="0.01"
                value={form.item_price}
                onChange={handleChange}
                disabled={isSaving}
                className="h-10 rounded-lg border px-3"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="item-modal-vat" className="text-sm font-medium text-gray-700 mt-3">
                IVA (%)
              </label>
              <input
                id="item-modal-vat"
                name="item_vat"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.item_vat}
                onChange={handleChange}
                disabled={isSaving}
                className="h-10 rounded-lg border px-3"
              />
            </div>
          </div>

          {isTableReservation && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="item-modal-duration" className="text-sm font-medium text-gray-700">
                    Duração (minutos)
                  </label>
                  <input
                    id="item-modal-duration"
                    name="item_duration"
                    type="number"
                    min="1"
                    step="1"
                    value={form.item_duration}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                    className="h-10 rounded-lg border px-3"
                  />
                </div>
                {reservationAssignment && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="item-modal-shift" className="text-sm font-medium text-gray-700">
                      Turno do horário
                    </label>
                    <select
                      id="item-modal-shift"
                      name="shift_index"
                      value={form.shift_index}
                      onChange={handleChange}
                      required
                      disabled={isSaving || shiftOptions.length === 0}
                      className="h-10 rounded-lg border px-3 disabled:bg-gray-100"
                    >
                      {shiftOptions.length === 0 ? (
                        <option value="">Sem turnos configurados</option>
                      ) : (
                        shiftOptions.map((shift) => (
                          <option key={shift.shift_index} value={shift.shift_index}>
                            {shift.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>
              {reservationAssignment && <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-bold text-gray-600">
                  Condições do item
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ["reservation", "Reserva"],
                    ["takeaway_order", "Encomenda"],
                    ["cart", "Carrinho"],
                    ["order", "Pedido"],
                    ["checkin", "Check-in"],
                  ].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name={name}
                        checked={form[name]}
                        onChange={handleChange}
                        disabled={isSaving}
                        className="h-4 w-4 accent-red-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>}
            </>
          )}
          {isProduct && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-bold text-gray-600">
                Condições do item
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ["takeaway_order", "Encomenda"],
                  ["cart", "Carrinho"],
                  ["order", "Pedido"],
                  ["checkin", "Check-in"],
                ].map(([name, label]) => (
                  <label key={name} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name={name}
                      checked={form[name]}
                      onChange={handleChange}
                      disabled={isSaving}
                      className="h-4 w-4 accent-red-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg bg-gray-200 px-4 py-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-red-500 px-4 py-2 text-white disabled:opacity-50"
          >
            {isSaving ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
