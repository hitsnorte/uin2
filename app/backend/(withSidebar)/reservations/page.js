"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { CiUser } from "react-icons/ci";

function getOutletName(outlet) {
  return (
    outlet.outlet_name1 ||
    outlet.outlet_name2 ||
    outlet.outlet_name3 ||
    outlet.outlet_name4 ||
    outlet.outlet_name5 ||
    `Outlet ${outlet.outlet_id}`
  );
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function readJsonResponse(response) {
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Não foi possível carregar os dados.");
  }
  return result;
}

export default function ReservationsPage() {
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateString()
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [people, setPeople] = useState(2);
  const [activeTab, setActiveTab] = useState("availability");
  const [shifts, setShifts] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState({});
  const [reservations, setReservations] = useState([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/outlets", { cache: "no-store", signal: controller.signal })
      .then(readJsonResponse)
      .then((result) => {
        const reservationOutlets = result.filter(
          (outlet) => Number(outlet.reservation) === 1
        );
        setOutlets(reservationOutlets);

        const requestedOutletId = new URLSearchParams(
          window.location.search
        ).get("outlet_id");
        const selectedOutlet = reservationOutlets.find(
          (outlet) => String(outlet.outlet_id) === requestedOutletId
        );
        setOutletId(
          String(
            selectedOutlet?.outlet_id ??
              reservationOutlets[0]?.outlet_id ??
              ""
          )
        );
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setError(fetchError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingOutlets(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!outletId || !selectedDate) {
      setShifts([]);
      setSelectedSlots({});
      setIsLoadingShifts(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingShifts(true);
    setError("");
    setShifts([]);
    setSelectedSlots({});
    setReservations([]);
    const params = new URLSearchParams({
      outlet_id: outletId,
      date: selectedDate,
      view: activeTab,
    });
    if (activeTab === "availability") {
      params.set("people", String(people));
    }

    fetch(`/api/reservations/dashboard?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(readJsonResponse)
      .then((result) => {
        if (activeTab === "reservations") {
          if (!Array.isArray(result.reservations)) {
            throw new TypeError("A API devolveu uma lista de reservas inválida.");
          }
          setReservations(result.reservations);
          return;
        }
        if (!Array.isArray(result.shifts)) {
          throw new TypeError("A API devolveu uma lista de turnos inválida.");
        }
        setShifts(result.shifts);
        setSelectedSlots(
          Object.fromEntries(
            result.shifts.flatMap((shift) => {
              const firstAvailableSlot = Array.isArray(shift.slots)
                ? shift.slots.find((slot) => slot.bookable)
                : null;
              return firstAvailableSlot
                ? [[shift.shift_index, firstAvailableSlot.time]]
                : [];
            })
          )
        );
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setError(fetchError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingShifts(false);
      });

    return () => controller.abort();
  }, [activeTab, outletId, people, selectedDate]);

  const todayDate = getLocalDateString();
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const monthLabel = new Intl.DateTimeFormat("pt-PT", {
    month: "long",
    year: "numeric",
  }).format(calendarMonth);
  const daysInMonth = new Date(
    calendarYear,
    calendarMonthIndex + 1,
    0
  ).getDate();
  const monthDates = Array.from(
    { length: daysInMonth },
    (_, index) =>
      getLocalDateString(
        new Date(calendarYear, calendarMonthIndex, index + 1)
      )
  );

  return (
    <div className="min-h-full w-full min-w-0">
      <div className="-mx-6 -mt-6">
        <Topbar title="Reservas" />
      </div>

      <div className="-mx-6 border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() =>
                  setCalendarMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() - 1,
                        1
                      )
                  )
                }
                className="grid h-8 w-8 place-items-center rounded-lg text-xl text-gray-600 hover:bg-gray-100"
              >
                ‹
              </button>
              <h2 className="min-w-36 text-center text-sm font-semibold capitalize text-gray-900">
                {monthLabel}
              </h2>
              <button
                type="button"
                aria-label="Mês seguinte"
                onClick={() =>
                  setCalendarMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() + 1,
                        1
                      )
                  )
                }
                className="grid h-8 w-8 place-items-center rounded-lg text-xl text-gray-600 hover:bg-gray-100"
              >
                ›
              </button>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
            aria-label="Dias do mês"
          >
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setCalendarMonth(
                  new Date(today.getFullYear(), today.getMonth(), 1)
                );
                setSelectedDate(todayDate);
              }}
              className="mr-1 shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hoje
            </button>
            {monthDates.map((date) => {
              const isSelected = date === selectedDate;
              const isToday = date === todayDate;
              const dateObject = new Date(`${date}T00:00:00.000Z`);
              const fullDate = new Intl.DateTimeFormat("pt-PT", {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(dateObject);
              const weekday = new Intl.DateTimeFormat("pt-PT", {
                weekday: "short",
                timeZone: "UTC",
              })
                .format(dateObject)
                .replace(".", "");

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  aria-label={fullDate}
                  aria-pressed={isSelected}
                  className={`flex min-w-11 shrink-0 flex-col items-center rounded-lg border px-2 py-1 transition ${
                    isSelected
                      ? "border-red-500 bg-red-500 text-white shadow-sm"
                      : isToday
                        ? "border-red-300 bg-white text-red-600 hover:bg-red-50"
                        : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50"
                  }`}
                >
                  <span className="text-xs font-medium capitalize">
                    {weekday}
                  </span>
                  <span className="text-sm font-semibold leading-5">
                    {Number(date.slice(8, 10))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="min-w-0 py-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Reservas
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Ocupação por mesas em cada turno.
            </p>
            <div
              className="mt-3 inline-flex rounded-lg bg-gray-100 p-1"
              role="tablist"
              aria-label="Vista das reservas"
            >
              {[
                { id: "availability", label: "Disponibilidade" },
                { id: "reservations", label: "Reservas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Outlet
              <select
                value={outletId}
                onChange={(event) => setOutletId(event.target.value)}
                disabled={isLoadingOutlets || outlets.length === 0}
                className="h-9 min-w-52 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-red-500"
              >
                {outlets.map((outlet) => (
                  <option key={outlet.outlet_id} value={outlet.outlet_id}>
                    {getOutletName(outlet)}
                  </option>
                ))}
              </select>
            </label>

            {activeTab === "availability" && (
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Pessoas
                <select
                  value={people}
                  onChange={(event) => setPeople(Number(event.target.value))}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-red-500"
                >
                  {Array.from({ length: 19 }, (_, index) => index + 2).map(
                    (count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    )
                  )}
                </select>
              </label>
            )}
          </div>
        </div>

        {isLoadingOutlets && (
          <p className="text-sm text-gray-500">A carregar outlets...</p>
        )}
        {!isLoadingOutlets && outlets.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Não existem outlets configurados para reservas.
          </p>
        )}
        {error && (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {isLoadingShifts && (
          <p className="text-sm text-gray-500">
            {activeTab === "availability"
              ? "A carregar turnos..."
              : "A carregar reservas..."}
          </p>
        )}
        {!isLoadingShifts &&
          activeTab === "availability" &&
          selectedDate &&
          shifts.length === 0 &&
          !error && (
            <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              Não existem turnos configurados para este dia.
            </p>
          )}

        {activeTab === "availability" && (
          <div className="grid gap-4">
            {shifts.map((shift) => {
              const selectedTime = selectedSlots[shift.shift_index];
              const selectedSlot = shift.slots.find(
                (slot) => slot.time === selectedTime
              );
              const occupancyPercent =
                selectedSlot?.occupancy_percent ?? shift.occupancy_percent;

              return (
              <section
                key={shift.shift_index}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {shift.label} - {shift.start_time}–{shift.end_time}
                      {shift.peak_time ? ` · pico às ${shift.peak_time}` : ""}
                    </h2>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {people} pessoas
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {selectedSlot ? (
                    <>
                      <span className="text-sm font-semibold text-emerald-700">
                        {selectedSlot.available} livres
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedSlot.occupied} ocupadas
                      </span>
                      <span className="text-sm text-gray-500">
                        de {selectedSlot.total} mesas às {selectedSlot.time}
                      </span>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Selecione um horário disponível para ver as mesas dessa
                      slot.
                    </p>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"
                    role="progressbar"
                    aria-label={
                      selectedSlot
                        ? `Ocupação às ${selectedSlot.time} no turno ${shift.label}`
                        : `Ocupação do turno ${shift.label}`
                    }
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={occupancyPercent}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancyPercent >= 80
                          ? "bg-red-500"
                          : occupancyPercent >= 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${occupancyPercent}%` }}
                    />
                  </div>
                  <p className="shrink-0 text-xs text-gray-500">
                    {occupancyPercent}% ocupado{" "}
                    {selectedSlot
                      ? `às ${selectedSlot.time}`
                      : "no turno"}
                  </p>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Horários para {people} pessoas
                  </h3>
                  {shift.slots.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shift.slots.map((slot) => {
                        const time = slot.time;
                        const isAvailable = slot.bookable;
                        const isSelected = selectedTime === time;

                        return isAvailable ? (
                          <button
                            key={time}
                            type="button"
                            onClick={() =>
                              setSelectedSlots((current) => ({
                                ...current,
                                [shift.shift_index]: time,
                              }))
                            }
                            aria-pressed={isSelected}
                            title={`Ver disponibilidade às ${time}`}
                            className={`rounded-lg border px-2.5 py-1 text-sm font-medium ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-200"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
                            }`}
                          >
                            {time}
                          </button>
                        ) : (
                          <span
                            key={time}
                            title="Completo"
                            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium text-gray-500 line-through decoration-gray-500"
                          >
                            {time}
                            <span className="sr-only"> (completo)</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Não existem horários disponíveis para este grupo.
                    </p>
                  )}
                </div>

                <details className="mt-4 border-t border-gray-100 pt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                    Mesas disponíveis por tipologia
                    {selectedSlot
                      ? ` · ${selectedSlot.time}`
                      : shift.peak_time
                        ? ` · pico às ${shift.peak_time}`
                        : ""}
                  </summary>
                  {(selectedSlot?.typologies || shift.typologies).length ? (
                    <ul className="mt-2 divide-y divide-gray-100">
                      {(selectedSlot?.typologies || shift.typologies).map(
                        (typology) => (
                          <li
                            key={typology.typology_id}
                            className="flex items-center justify-between gap-3 py-1.5 text-sm"
                          >
                            <span className="inline-flex items-center gap-1.5 text-gray-700">
                              <CiUser size={20} />
                              <span>× {typology.seats ?? "—"}</span>
                            </span>
                            <span className="font-semibold text-gray-900">
                              {typology.available} livres
                              <span className="font-normal text-gray-500">
                                {" "}
                                / {typology.total}
                              </span>
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Não existem tipologias configuradas.
                    </p>
                  )}
                </details>
              </section>
              );
            })}
          </div>
        )}

        {activeTab === "reservations" && !isLoadingShifts && selectedDate && (
          <div className="grid gap-3">
            {reservations.length ? (
              reservations.map((reservation) => (
                <section
                  key={reservation.reservation_id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {reservation.time}
                    </span>
                    <div className="min-w-0">
                      <p className="break-words font-bold text-gray-800">
                        {reservation.name}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-sm text-gray-600">
                        <CiUser size={18} aria-hidden="true" />
                        {reservation.pax_size}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reservation.tables.length ? (
                      reservation.tables.map((table, index) => (
                        <span
                          key={`${reservation.reservation_id}-${index}`}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700"
                        >
                          {table.count > 1 ? `${table.count} × ` : ""}
                          {table.typology || "Mesa"}
                          {table.room ? ` · ${table.room}` : ""}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">
                        Mesa não atribuída
                      </span>
                    )}
                  </div>
                </section>
              ))
            ) : (
              <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                Não existem reservas para este dia.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}