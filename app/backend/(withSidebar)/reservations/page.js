"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { CiUser } from "react-icons/ci";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

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

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
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
  const [availableDates, setAvailableDates] = useState([]);
  const [people, setPeople] = useState(2);
  const [activeTab, setActiveTab] = useState("availability");
  const [shifts, setShifts] = useState([]);
  const [reservationFromTime, setReservationFromTime] = useState("");
  const [reservations, setReservations] = useState([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [error, setError] = useState("");
  const [calendarError, setCalendarError] = useState("");

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
    if (!outletId) {
      setAvailableDates([]);
      return;
    }

    const controller = new AbortController();
    setAvailableDates([]);
    setCalendarError("");

    fetch(
      `/api/reservations/dashboard?${new URLSearchParams({
        outlet_id: outletId,
        view: "availability",
      })}`,
      { cache: "no-store", signal: controller.signal }
    )
      .then(readJsonResponse)
      .then((result) => {
        if (
          !Array.isArray(result.available_dates) ||
          result.available_dates.some(
            (date) => typeof date !== "string" || !isValidDateString(date)
          )
        ) {
          throw new TypeError(
            "A API devolveu uma lista de datas de disponibilidade inválida."
          );
        }
        const upcomingDates = result.available_dates.filter(
          (date) => date >= getLocalDateString()
        );
        setAvailableDates(upcomingDates);
        setSelectedDate((current) =>
          upcomingDates.includes(current)
            ? current
            : upcomingDates[0] || getLocalDateString()
        );
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setCalendarError(fetchError.message);
        }
      });

    return () => controller.abort();
  }, [outletId]);

  useEffect(() => {
    if (!outletId || !selectedDate) {
      setShifts([]);
      setIsLoadingShifts(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingShifts(true);
    setError("");
    setShifts([]);
    setReservations([]);
    const params = new URLSearchParams({
      outlet_id: outletId,
      date: selectedDate,
      view: activeTab,
    });
    if (activeTab === "availability") {
      params.set("people", String(people));
    } else if (reservationFromTime) {
      params.set("from_time", reservationFromTime);
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
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setError(fetchError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingShifts(false);
      });

    return () => controller.abort();
  }, [activeTab, outletId, people, reservationFromTime, selectedDate]);

  const todayDate = getLocalDateString();

  return (
    <div className="min-h-full w-full min-w-0">
      <div className="-mx-6 -mt-6">
        <Topbar title="Reservas" />
      </div>

      <div className="-mx-6 border-b border-gray-200 bg-white px-6 py-3">
        <div
          className="flex min-w-0 items-center gap-2"
          role="group"
          aria-label="Dias com disponibilidade"
        >
          <button
            type="button"
            onClick={() => {
              setReservationFromTime("");
              setSelectedDate(todayDate);
            }}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hoje
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1">
            {availableDates.map((date, index) => {
              const isSelected = date === selectedDate;
              const isToday = date === todayDate;
              const dateObject = new Date(`${date}T00:00:00.000Z`);
              const fullDate = new Intl.DateTimeFormat("pt-PT", {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(dateObject);
              const weekday = [
                "Dom",
                "Seg",
                "Ter",
                "Qua",
                "Qui",
                "Sex",
                "Sab",
              ][dateObject.getUTCDay()];
              const previousDate = availableDates[index - 1];
              const startsNewMonth =
                !previousDate || date.slice(0, 7) !== previousDate.slice(0, 7);
              const monthLabel = new Intl.DateTimeFormat("pt-PT", {
                month: "short",
                timeZone: "UTC",
              })
                .format(dateObject)
                .replace(".", "")
                .replace(/^./, (letter) => letter.toLocaleUpperCase("pt-PT"));

              return (
                <div
                  key={date}
                  className={`flex min-w-12 shrink-0 flex-col items-center gap-1 ${
                    startsNewMonth
                      ? "ml-1 border-l border-gray-200 pl-2"
                      : ""
                  }`}
                >
                  {startsNewMonth ? (
                    <span className="h-4 text-xs font-medium text-gray-500">
                      {monthLabel}
                    </span>
                  ) : (
                    <span aria-hidden="true" className="h-4" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setReservationFromTime("");
                      setSelectedDate(date);
                    }}
                    aria-label={fullDate}
                    aria-pressed={isSelected}
                    className={`flex min-w-12 shrink-0 flex-col items-center rounded-lg border px-2 py-1 transition ${
                      isSelected
                        ? "border-red-500 bg-red-500 text-white shadow-sm"
                        : isToday
                          ? "border-red-300 bg-white text-red-600 hover:bg-red-50"
                          : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50"
                    }`}
                  >
                    <span className="text-sm font-semibold leading-5">
                      {Number(date.slice(8, 10))}
                    </span>
                    <span className="text-xs font-medium capitalize">
                      {weekday}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {calendarError && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {calendarError}
          </p>
        )}
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
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== "reservations") {
                      setReservationFromTime("");
                    }
                  }}
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
                onChange={(event) => {
                  setReservationFromTime("");
                  setOutletId(event.target.value);
                }}
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

                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Afluência
                  </h3>
                  {shift.slots.length ? (
                    <div
                      className="mt-2 overflow-x-auto pb-2"
                      role="group"
                      aria-label={`Ocupação por horário no turno ${shift.label}`}
                    >
                      <div className="flex min-w-max items-end gap-2">
                        {shift.slots.map((slot) => {
                          const time = slot.time;
                          const barColor =
                            slot.total > 0 && slot.available <= 0
                              ? "bg-red-300"
                              : slot.occupied > 0
                                ? "bg-amber-400"
                                : "bg-emerald-400";
                          const status =
                            slot.total > 0 && slot.available <= 0
                              ? "lotada"
                              : slot.occupied > 0
                                ? "com reservas"
                                : "sem reservas";

                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => {
                                setReservationFromTime(time);
                                setActiveTab("reservations");
                              }}
                              aria-label={`${time}: ${slot.occupancy_percent}% ocupado, ${status}`}
                              title={`${time} · ${slot.occupancy_percent}% ocupado · ${slot.occupied}/${slot.total} mesas · ${status}`}
                              className="flex w-12 shrink-0 flex-col items-center gap-1 rounded-t-md px-1 pb-1 pt-2 text-xs transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                            >
                              <span className="text-[10px] font-medium text-gray-500">
                                {slot.occupancy_percent}%
                              </span>
                              <span className="flex h-8 w-4 items-end overflow-hidden rounded-t-sm bg-gray-100">
                                <span
                                  className={`w-full rounded-t-sm transition-all ${barColor}`}
                                  style={{
                                    height: `${Math.max(slot.occupancy_percent, 4)}%`,
                                  }}
                                />
                              </span>
                              <span className="font-medium text-gray-700">
                                {time}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Não existem horários disponíveis para este grupo.
                    </p>
                  )}
                </div>

                <details className="group border-t border-gray-100 pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-800">
                    <span>Mesas disponíveis por tipologia</span>
                    <IoIosArrowDown
                      aria-hidden="true"
                      className="group-open:hidden"
                    />
                    <IoIosArrowUp
                      aria-hidden="true"
                      className="hidden group-open:block"
                    />
                  </summary>
                  {shift.typologies.length ? (
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0 text-sm">
                        <thead>
                          <tr>
                            <th
                              scope="col"
                              className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-600"
                            >
                              Pessoas
                            </th>
                            {shift.slots.map((slot) => (
                              <th
                                key={slot.time}
                                scope="col"
                                className="whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-gray-600"
                              >
                                {slot.time}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {shift.typologies.map((typology) => (
                            <tr key={typology.typology_id}>
                              <th
                                scope="row"
                                className="sticky left-0 whitespace-nowrap border-t border-gray-100 bg-white px-3 py-2 text-left font-medium text-gray-700"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <CiUser size={20} aria-hidden="true" />×{" "}
                                  {typology.seats ?? "—"}
                                </span>
                              </th>
                              {shift.slots.map((slot) => {
                                const slotTypology = slot.typologies.find(
                                  (item) =>
                                    item.typology_id === typology.typology_id
                                );
                                const available = slotTypology?.available ?? 0;
                                const total = slotTypology?.total ?? 0;

                                return (
                                  <td
                                    key={slot.time}
                                    aria-label={`${available} livres de ${total}`}
                                    className="whitespace-nowrap border-t border-gray-100 px-3 py-2 text-center font-semibold text-gray-900"
                                  >
                                    {available}/{total}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
            {reservationFromTime && (
              <p className="text-sm text-gray-600">
                Reservas a partir das {reservationFromTime}
              </p>
            )}
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
                {reservationFromTime
                  ? `Não existem reservas a partir das ${reservationFromTime}.`
                  : "Não existem reservas para este dia."}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}