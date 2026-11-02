"use client";

import { useEffect, useRef, useState } from "react";
import { isReservationTimeInPast } from "@/lib/tableReservation";
import { PiForkKnifeLight } from "react-icons/pi";
import { CiCalendar } from "react-icons/ci";
import { TfiEmail } from "react-icons/tfi";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { FaArrowLeft } from "react-icons/fa6";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatReservationDate(value) {
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) return value;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).formatToParts(parsedDate);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${values.weekday} ${values.day} ${values.month}`;
}

function formatReservationDateLong(value) {
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(parsedDate);
}

function getLocalTimeString(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Lisbon";
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

export default function TableReservationClient() {
  const [outletId, setOutletId] = useState("");
  const [outletName, setOutletName] = useState("");
  const [outletImage, setOutletImage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#ef4444");
  const [people, setPeople] = useState(2);
  const [date, setDate] = useState(() => getLocalDateString());
  const dateInputRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const [startingTime, setStartingTime] = useState(() =>
    getLocalTimeString()
  );
  const [slots, setSlots] = useState([]);
  const [timeOptions, setTimeOptions] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar os dados da sessão.");
        }
        return response.json();
      })
      .then((session) => {
        if (active) setUserEmail(session?.authenticated ? session.user?.email || "" : "");
      })
      .catch((sessionError) => {
        console.error(sessionError);
        if (active) setSessionError(sessionError.message);
      })
      .finally(() => {
        if (active) setIsLoadingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
        if (active) {
          setOutletName(getOutletName(outlet));
          setOutletImage(outlet.outlet_card_background || "");
        }
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
    setIsConfirmationOpen(false);

    const params = new URLSearchParams({
      outlet_id: outletId,
      date,
      people: String(people),
      time_zone: getLocalTimeZone(),
    });
    fetch(`/api/availability?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Não foi possível carregar os horários.");
        }
        if (
          !result ||
          !Array.isArray(result.slots) ||
          !Array.isArray(result.time_options)
        ) {
          throw new TypeError("A API de disponibilidade devolveu dados inválidos.");
        }
        setSlots(result.slots);
        setTimeOptions(result.time_options);
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          console.error(fetchError);
          setSlots([]);
          setTimeOptions([]);
          setError(fetchError.message || "Não foi possível carregar os horários.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [date, outletId, people, availabilityVersion]);

  const today = getLocalDateString();
  const timeZone = getLocalTimeZone();
  const selectableTimeOptions = timeOptions.filter(
    (time) => !isReservationTimeInPast(date, time, now, timeZone)
  );
  const selectedStartingTime = selectableTimeOptions.includes(startingTime)
    ? startingTime
    : selectableTimeOptions[0] || "";

  async function confirmReservation() {
    if (
      !selectedSlot ||
      isBooking ||
      isReservationTimeInPast(
        date,
        selectedSlot.start_time,
        new Date(),
        getLocalTimeZone()
      )
    ) {
      return;
    }
    setIsBooking(true);
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
          time_zone: getLocalTimeZone(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível confirmar a reserva.");
      }

      setSelectedSlot(null);
      setIsConfirmationOpen(false);
      setIsSuccessOpen(true);
    } catch (bookingError) {
      console.error(bookingError);
      setError(bookingError.message || "Não foi possível confirmar a reserva.");
      setAvailabilityVersion((version) => version + 1);
    } finally {
      setIsBooking(false);
    }
  }

  const availableSlots = slots.filter(
    (slot) =>
      slot.start_time >= selectedStartingTime &&
      !isReservationTimeInPast(date, slot.start_time, now, timeZone)
  );
  const hasSelectedAvailableSlot = availableSlots.some(
    (slot) =>
      slot.start_time === selectedSlot?.start_time &&
      slot.end_time === selectedSlot?.end_time
  );

  return (
    <main className="flex min-h-screen bg-white text-gray-900">
      <div className="min-h-screen w-full max-w-md shrink-0 bg-white px-4 pb-8 pt-8 sm:px-6">
        <section>
          <div className="relative flex min-h-10 items-center justify-center">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="absolute left-0 rounded-lg bg-white p-2 text-sm hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-center text-2xl font-semibold">
              Reserve your table
            </h1>
          </div>
          {outletName && (
            <div className="text-center">
              <p className="mt-1 text-gray-600">{outletName}</p>
            </div>
          )}

          {!outletId && (
            <p className="mt-6 text-sm text-red-600" role="alert">
              Please select an outlet to check availability.
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Party
              <select
                value={people}
                onChange={(event) => setPeople(Number(event.target.value))}
                className="h-11 rounded-lg border border-gray-300 px-3 outline-none focus:border-[var(--primary-color)]"
                style={{ "--primary-color": primaryColor }}
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

            <div className="flex flex-col gap-2 text-sm font-medium">
              <span>Date</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const dateInput = dateInputRef.current;
                    if (typeof dateInput?.showPicker === "function") {
                      dateInput.showPicker();
                    } else {
                      dateInput?.click();
                    }
                  }}
                  className="relative flex h-11 w-full items-center rounded-lg border border-gray-300 bg-white px-3 text-left font-normal outline-none focus:border-[var(--primary-color)]"
                  style={{ "--primary-color": primaryColor }}
                  aria-label={`Selecionar data, ${formatReservationDate(date)}`}
                >
                  <span aria-hidden="true">{formatReservationDate(date)}</span>
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  min={today}
                  value={date}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setDate(nextDate);
                    setStartingTime("");
                  }}
                  aria-label="Data da reserva"
                  tabIndex={-1}
                  className="pointer-events-none absolute h-px w-px opacity-0"
                />
              </div>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Time
              <select
                value={selectedStartingTime}
                onChange={(event) => setStartingTime(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 px-3 outline-none focus:border-[var(--primary-color)]"
                style={{ "--primary-color": primaryColor }}
              >
                <option value="" disabled>
                  {selectableTimeOptions.length
                    ? "Select a time"
                    : "No times available"}
                </option>
                {selectableTimeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-8">
            <hr className="border-gray-300" />
            {loading ? (
              <p className="mt-4 text-sm text-gray-500">Loading times...</p>
            ) : error ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : availableSlots.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {availableSlots.map((slot) => {
                  const isSelected =
                    selectedSlot?.start_time === slot.start_time &&
                    selectedSlot?.end_time === slot.end_time;

                  return (
                    <button
                      type="button"
                      key={`${slot.start_time}-${slot.end_time}`}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setError("");
                        setIsConfirmationOpen(true);
                      }}
                      aria-pressed={isSelected}
                      className="rounded-lg border border-gray-300 px-2 py-3 text-center text-sm font-medium transition sm:px-4 sm:text-base text-black"
                      style={{
                        // color: primaryColor,
                        backgroundColor: isSelected ? primaryColor : "white",
                        ...(isSelected ? { color: "white" } : {}),
                      }}
                    >
                      {slot.start_time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500 flex flex-row items-center gap-2">
                <CiCalendar size={20} />
                No times available for this date.
              </p>
            )}
          </div>
        </section>
      </div>
      <div
        role={outletImage ? "img" : undefined}
        aria-label={outletImage ? `${outletName} image` : undefined}
        className="sticky top-0 hidden h-screen min-w-0 flex-1 bg-gray-100 bg-cover bg-center lg:block"
        style={
          outletImage
            ? { backgroundImage: `url("${outletImage}")` }
            : undefined
        }
      />

      {isConfirmationOpen && selectedSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isBooking) {
              setIsConfirmationOpen(false);
              setSelectedSlot(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-confirmation-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="reservation-confirmation-title"
              className="text-xl font-semibold"
            >
              Your reservation
            </h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <PiForkKnifeLight size={25} />
                <p className="font-bold">
                  Party of {people}
                </p>
              </div>
              <div className="flex items-start items-center gap-3">
                <CiCalendar size={25} />
                <div>
                  <p className="font-bold">
                    {formatReservationDateLong(date)}
                  </p>
                  <p className="mt-1 text-gray-500">{selectedSlot.start_time}</p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="font-bold">Contact Info</p>
                <div className="mt-2 flex items-center gap-2">
                  <TfiEmail size={20} className="shrink-0" />
                  <dd className="break-all font-medium">
                    {isLoadingSession
                      ? "A carregar..."
                      : sessionError
                        ? "Indisponível"
                        : userEmail || "Sem sessão iniciada"}
                  </dd>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="font-bold">Rules &amp; restrictions</p>
                <div className="mt-3 flex items-start gap-2">
                  <IoIosCloseCircleOutline size={25} className="shrink-0" />
                  <div className="text-gray-500">
                    <p className="font-medium text-gray-900">
                      Cancellation policy
                    </p>
                    <p className="mt-1">
                      If you can&apos;t make it to your reservation, please cancel
                      your reservation in advance.
                    </p>
                  </div>
                </div>
              </div>
            </dl>
            {sessionError && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {sessionError}
              </p>
            )}
            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmationOpen(false);
                  setSelectedSlot(null);
                  setError("");
                }}
                disabled={isBooking}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmReservation}
                disabled={
                  !hasSelectedAvailableSlot ||
                  isBooking ||
                  loading ||
                  isLoadingSession
                }
                className="flex-1 rounded-lg px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                style={{ backgroundColor: primaryColor }}
              >
                {isBooking ? "A confirmar..." : "Confirmar"}
              </button>
            </div>
          </section>
        </div>
      )}

      {isSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-success-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <p
              id="reservation-success-title"
              className="text-base"
            >
              Your reservation has been sent.
            </p>
            <button
              type="button"
              onClick={() => setIsSuccessOpen(false)}
              className="mt-6 ml-auto block rounded-lg px-4 py-2 text-sm text-white transition"
              style={{ backgroundColor: primaryColor }}
            >
              OK
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
