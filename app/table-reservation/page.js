"use client";

import { useEffect, useState } from "react";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOutletName(outlet) {
  return (
    outlet?.outlet_name1 ||
    outlet?.outlet_name2 ||
    outlet?.outlet_name3 ||
    outlet?.outlet_name4 ||
    outlet?.outlet_name5 ||
    "Outlet"
  );
}

export default function TableReservationPage() {
  const [outletId, setOutletId] = useState("");
  const [outletName, setOutletName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#ef4444");
  const [people, setPeople] = useState(2);
  const [date, setDate] = useState(() => getLocalDateString());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [availabilityVersion, setAvailabilityVersion] = useState(0);

  useEffect(() => {
    fetch("/api/personalize")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar a personalização.");
        }
        return response.json();
      })
      .then((personalize) => {
        if (typeof personalize?.primary_color === "string" && personalize.primary_color) {
          setPrimaryColor(personalize.primary_color);
        }
      })
      .catch((fetchError) => {
        console.error(fetchError);
      });
  }, []);

  useEffect(() => {
    const requestedOutletId = new URLSearchParams(window.location.search).get(
      "outlet_id"
    );
    if (requestedOutletId) setOutletId(requestedOutletId);
  }, []);

  useEffect(() => {
    if (!outletId) return;

    let active = true;
    fetch("/api/outlets")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar o outlet.");
        }
        return response.json();
      })
      .then((outlets) => {
        const outlet = outlets.find(
          (item) => Number(item.outlet_id) === Number(outletId)
        );
        if (!outlet || Number(outlet.reservation) !== 1) {
          throw new Error("Este outlet não permite reservas de mesa.");
        }
        if (active) setOutletName(getOutletName(outlet));
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message);
      });

    return () => {
      active = false;
    };
  }, [outletId]);

  useEffect(() => {
    if (!outletId || !date) return;

    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSelectedSlot(null);

    fetch(
      `/api/availability?outlet_id=${encodeURIComponent(outletId)}&date=${encodeURIComponent(date)}&people=${people}`,
      { signal: controller.signal, cache: "no-store" }
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Não foi possível carregar os horários.");
        }
        if (!Array.isArray(result)) {
          throw new TypeError("A API de disponibilidade devolveu dados inválidos.");
        }
        setSlots(result);
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          console.error(fetchError);
          setSlots([]);
          setError(fetchError.message || "Não foi possível carregar os horários.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [date, outletId, people, availabilityVersion]);

  async function confirmReservation() {
    if (!selectedSlot || isBooking) return;

    setIsBooking(true);
    setBookingMessage("");
    setError("");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: Number(outletId),
          pax_size: people,
          date,
          start_time: selectedSlot.start_time,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível confirmar a reserva.");
      }

      setSelectedSlot(null);
      setBookingMessage("Reserva confirmada com sucesso.");
      setAvailabilityVersion((version) => version + 1);
    } catch (bookingError) {
      console.error(bookingError);
      setError(bookingError.message || "Não foi possível confirmar a reserva.");
      setAvailabilityVersion((version) => version + 1);
    } finally {
      setIsBooking(false);
    }
  }

  const today = getLocalDateString();

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-8 pt-20 text-gray-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="fixed left-4 top-4 z-10 rounded-lg bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-100 sm:left-6 sm:top-6"
        >
          ← Voltar
        </button>

        <section className="rounded-2xl bg-white p-5 shadow-md sm:p-8">
          <h1 className="text-2xl font-semibold">Reservar mesa</h1>
          {outletName && (
            <p className="mt-1 text-gray-600">{outletName}</p>
          )}

          {!outletId && (
            <p className="mt-6 text-sm text-red-600" role="alert">
              Selecione um outlet para consultar a disponibilidade.
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Número de pessoas
              <input
                type="number"
                min="1"
                max="20"
                value={people}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value >= 1 && value <= 20) {
                    setPeople(value);
                  }
                }}
                className="h-11 rounded-lg border border-gray-300 px-3 outline-none focus:border-[var(--primary-color)]"
                style={{ "--primary-color": primaryColor }}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Data
              <input
                type="date"
                min={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 px-3 outline-none focus:border-[var(--primary-color)]"
                style={{ "--primary-color": primaryColor }}
              />
            </label>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold">Horários disponíveis</h2>
            {bookingMessage && (
              <p className="mt-4 text-sm text-green-700" role="status">
                {bookingMessage}
              </p>
            )}
            {loading ? (
              <p className="mt-4 text-sm text-gray-500">A carregar horários...</p>
            ) : error ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : slots.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {slots.map((slot) => {
                  const isSelected =
                    selectedSlot?.start_time === slot.start_time &&
                    selectedSlot?.end_time === slot.end_time;

                  return (
                    <button
                      type="button"
                      key={`${slot.start_time}-${slot.end_time}`}
                      onClick={() => setSelectedSlot(slot)}
                      aria-pressed={isSelected}
                      className={`rounded-lg border px-4 py-3 text-center font-medium transition ${
                        isSelected
                          ? "text-white"
                          : "border-gray-300 bg-white"
                      }`}
                      style={
                        isSelected
                          ? { borderColor: primaryColor, backgroundColor: primaryColor }
                          : {}
                      }
                    >
                      {slot.start_time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Não existem horários disponíveis para esta data.
              </p>
            )}
            <button
              type="button"
              onClick={confirmReservation}
              disabled={!selectedSlot || isBooking || loading}
              className="mt-6 rounded-lg bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {isBooking ? "A confirmar..." : "Confirmar Reserva"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
