"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

const DAYS = [
  { key: "segunda", label: "Segunda-feira" },
  { key: "terca", label: "Terça-feira" },
  { key: "quarta", label: "Quarta-feira" },
  { key: "quinta", label: "Quinta-feira" },
  { key: "sexta", label: "Sexta-feira" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

const DEFAULT_SLOT_DURATION = 30;

function isValidSlotDuration(value) {
  return (
    Number.isInteger(value) &&
    value >= 15 &&
    value <= 120 &&
    value % 15 === 0
  );
}

function getTimeOptions(currentValue, slotDuration = DEFAULT_SLOT_DURATION) {
  const options = Array.from(
    { length: Math.ceil((24 * 60) / slotDuration) },
    (_, index) => {
      const totalMinutes = index * slotDuration;
      const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
      const minutes = String(totalMinutes % 60).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
  );

  if (currentValue && !options.includes(currentValue)) {
    options.push(currentValue);
    options.sort();
  }

  return options;
}

function getMinutes(time) {
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function createEmptySchedule(name = "") {
  return {
    name,
    slotDuration: DEFAULT_SLOT_DURATION,
    days: Object.fromEntries(DAYS.map(({ key }) => [key, []])),
    exceptions: [],
  };
}

function readSchedule(schedule) {
  let data = schedule.schedule_json;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  const slotDuration = data?.slotDuration ?? schedule.slotDuration;
  const exceptionData = Array.isArray(schedule.exceptions)
    ? schedule.exceptions
    : data?.exceptions;

  return {
    name: data?.name || "",
    slotDuration: isValidSlotDuration(slotDuration)
      ? slotDuration
      : DEFAULT_SLOT_DURATION,
    days: Object.fromEntries(
      DAYS.map(({ key }) => [
        key,
        Array.isArray(data?.days?.[key]) ? data.days[key] : [],
      ])
    ),
    exceptions: Array.isArray(exceptionData)
      ? exceptionData.map((exception) => ({
          startDate:
            typeof exception?.startDate === "string" ? exception.startDate : "",
          endDate:
            typeof exception?.endDate === "string" ? exception.endDate : "",
          reason: typeof exception?.reason === "string" ? exception.reason : "",
        }))
      : [],
  };
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [schedule, setSchedule] = useState(createEmptySchedule);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function fetchSchedules() {
    const response = await fetch("/api/schedules");
    if (!response.ok) throw new Error("Não foi possível carregar os horários.");
    setSchedules(await response.json());
  }

  useEffect(() => {
    fetchSchedules().catch((error) => {
      console.error(error);
      alert(error.message);
    });
  }, []);

  function openCreate() {
    setEditingId(null);
    setSchedule(createEmptySchedule());
    setShowModal(true);
  }

  function openEdit(item) {
    setEditingId(item.schedule_id);
    setSchedule(readSchedule(item));
    setShowModal(true);
  }

  function updateDay(dayKey, update) {
    setSchedule((current) => ({
      ...current,
      days: {
        ...current.days,
        [dayKey]: update(current.days[dayKey]),
      },
    }));
  }

  function addTime(dayKey) {
    updateDay(dayKey, (times) => [
      ...times,
      { name: "", start: "", end: "" },
    ]);
  }

  function updateTime(dayKey, timeIndex, field, value) {
    updateDay(dayKey, (times) =>
      times.map((time, index) =>
        index === timeIndex ? { ...time, [field]: value } : time
      )
    );
  }

  function copyPreviousDay(dayIndex) {
    const day = DAYS[dayIndex];
    const previousDay = DAYS[dayIndex - 1];
    if (!day || !previousDay) return;

    updateDay(day.key, () =>
      schedule.days[previousDay.key].map((time) => ({ ...time }))
    );
  }

  function addException() {
    setSchedule((current) => ({
      ...current,
      exceptions: [
        ...current.exceptions,
        { startDate: "", endDate: "", reason: "" },
      ],
    }));
  }

  function updateException(exceptionIndex, field, value) {
    setSchedule((current) => ({
      ...current,
      exceptions: current.exceptions.map((exception, index) =>
        index === exceptionIndex
          ? { ...exception, [field]: value }
          : exception
      ),
    }));
  }

  function removeException(exceptionIndex) {
    setSchedule((current) => ({
      ...current,
      exceptions: current.exceptions.filter(
        (_, index) => index !== exceptionIndex
      ),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!schedule.name.trim()) return;

    const hasInvalidTimes = DAYS.some(({ key }) =>
      schedule.days[key].some((time, index, times) => {
        const start = getMinutes(time.start);
        const end = getMinutes(time.end);
        const previousEnds = times
          .slice(0, index)
          .map(({ end: previousEnd }) => getMinutes(previousEnd))
          .filter((previousEnd) => previousEnd !== null);

        return (
          start === null ||
          end === null ||
          start >= end ||
          previousEnds.some((previousEnd) => start < previousEnd)
        );
      })
    );

    if (hasInvalidTimes) {
      alert(
        "O início de cada turno deve ser igual ou posterior ao fim do turno anterior."
      );
      return;
    }

    const hasInvalidExceptions = schedule.exceptions.some(
      ({ startDate, endDate, reason }) =>
        !startDate || !endDate || startDate > endDate || !reason.trim()
    );

    if (hasInvalidExceptions) {
      alert(
        "Preencha o motivo e um intervalo de datas válido para cada exceção."
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/schedules/${editingId}` : "/api/schedules",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedule_json: {
              name: schedule.name.trim(),
              days: schedule.days,
            },
            slotDuration: schedule.slotDuration,
            exceptions: schedule.exceptions,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível guardar o horário.");
      }

      setShowModal(false);
      await fetchSchedules();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSchedule(id) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Não foi possível eliminar o horário.");
      await fetchSchedules();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  }

  const filteredSchedules = schedules.filter((item) => {
    const data = readSchedule(item);
    return `${item.schedule_id} ${data.name}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Horários" />
      </div>

      <div className="my-6 flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar horário..."
          className="h-11 w-72 rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
        />
        <button
          onClick={openCreate}
          disabled={showModal || isSaving}
          className={`h-11 rounded-lg px-5 ${showModal || isSaving ? "cursor-not-allowed bg-gray-300 text-gray-500" : "bg-red-500 text-white hover:bg-red-600"}`}
        >
          + Criar Horário
        </button>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Nome</th>
              <th className="p-4">Dias com horário</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedules.map((item) => {
              const data = readSchedule(item);
              const daysWithTimes = DAYS.filter(
                ({ key }) => data.days[key].length > 0
              ).length;

              return (
                <tr key={item.schedule_id} className="border-t border-gray-100">
                  <td className="p-4 text-gray-500">{item.schedule_id}</td>
                  <td className="p-4 font-medium text-gray-800">
                    {data.name || "-"}
                  </td>
                  <td className="p-4 text-gray-600">{daysWithTimes} de 7</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteSchedule(item.schedule_id)}
                        disabled={deletingId === item.schedule_id}
                        className={`rounded-lg px-3 py-1 text-sm ${deletingId === item.schedule_id ? "cursor-not-allowed bg-gray-300 text-gray-500" : "bg-red-500 text-white hover:bg-red-600"}`}
                      >
                        {deletingId === item.schedule_id ? "A eliminar..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredSchedules.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  Nenhum horário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-lg font-semibold">
                {editingId ? "Editar Horário" : "Criar Horário"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

     
<form
  id="schedule-form"
  onSubmit={handleSubmit}
  className="flex min-h-0 flex-1 flex-col"
>
  <div className="flex-1 space-y-5 overflow-y-auto p-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label
          htmlFor="schedule-name"
          className="mb-2 block text-sm font-semibold text-gray-600"
        >
          Nome do horário
        </label>
        <input
          id="schedule-name"
          value={schedule.name}
          onChange={(event) =>
            setSchedule((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
          required
          maxLength={100}
          placeholder="Ex.: Restaurante"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
        />
      </div>

      <div>
        <label
          htmlFor="slot-duration"
          className="mb-2 block text-sm font-semibold text-gray-600"
        >
          Duração Slot
        </label>

        <div
          id="slot-duration"
          className="flex h-11 w-full items-center overflow-hidden rounded-lg border border-gray-300"
        >
          <button
            type="button"
            onClick={() =>
              setSchedule((current) => ({
                ...current,
                slotDuration: Math.max(
                  15,
                  (current.slotDuration || 30) - 15
                ),
              }))
            }
            disabled={(schedule.slotDuration || 30) <= 15}
            className="flex h-full w-11 shrink-0 items-center justify-center text-lg text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Diminuir duração do slot"
          >
            −
          </button>

          <div className="flex h-full flex-1 items-center justify-center border-x border-gray-300 text-sm font-semibold text-gray-700">
            {schedule.slotDuration || 30} min
          </div>

          <button
            type="button"
            onClick={() =>
              setSchedule((current) => ({
                ...current,
                slotDuration: Math.min(
                  120,
                  (current.slotDuration || 30) + 15
                ),
              }))
            }
            disabled={(schedule.slotDuration || 30) >= 120}
            className="flex h-full w-11 shrink-0 items-center justify-center text-lg text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Aumentar duração do slot"
          >
            +
          </button>
        </div>
      </div>
    </div>

    {DAYS.map(({ key, label }, dayIndex) => (
      <section
        key={key}
        className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-800">{label}</h3>

          <div className="flex gap-2">
            {dayIndex > 0 && (
              <button
                type="button"
                onClick={() => copyPreviousDay(dayIndex)}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
              >
                Replicar horário do dia anterior
              </button>
            )}

            <button
              type="button"
              onClick={() => addTime(key)}
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              + Adicionar horário
            </button>
          </div>
        </div>

        {schedule.days[key].length === 0 ? (
          <p className="text-sm text-gray-500">
            Sem horários definidos.
          </p>
        ) : (
          <div className="space-y-2">
            {schedule.days[key].map((time, timeIndex, times) => {
              const previousEnds = times
                .slice(0, timeIndex)
                .map(({ end }) => getMinutes(end))
                .filter((end) => end !== null);
              const nextStarts = times
                .slice(timeIndex + 1)
                .map(({ start }) => getMinutes(start))
                .filter((start) => start !== null);
              const earliestNextStart =
                nextStarts.length > 0 ? Math.min(...nextStarts) : null;
              const latestPreviousEnd =
                previousEnds.length > 0 ? Math.max(...previousEnds) : null;
              const startOptions = getTimeOptions(
                time.start,
                schedule.slotDuration
              ).filter((option) => {
                const optionMinutes = getMinutes(option);
                return (
                  previousEnds.every(
                    (previousEnd) => optionMinutes >= previousEnd
                  ) &&
                  (earliestNextStart === null ||
                    optionMinutes < earliestNextStart) &&
                  (getMinutes(time.end) === null ||
                    optionMinutes < getMinutes(time.end))
                );
              });
              const endOptions = getTimeOptions(
                time.end,
                schedule.slotDuration
              ).filter((option) => {
                const optionMinutes = getMinutes(option);
                return (
                  (latestPreviousEnd === null ||
                    optionMinutes >= latestPreviousEnd) &&
                  (getMinutes(time.start) === null ||
                    optionMinutes > getMinutes(time.start)) &&
                  (earliestNextStart === null ||
                    optionMinutes <= earliestNextStart)
                );
              });

              return (
                <div
                  key={`${key}-${timeIndex}`}
                  className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,1fr)_auto]"
                >
                <input
                  type="text"
                  aria-label={`Nome do turno, ${label}`}
                  value={time.name || ""}
                  onChange={(event) =>
                    updateTime(
                      key,
                      timeIndex,
                      "name",
                      event.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="Nome do turno"
                  className="h-11 min-w-0 rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
                />

                <label
                  className="sr-only"
                  htmlFor={`${key}-${timeIndex}-start`}
                >
                  Início de {label.toLowerCase()}
                </label>

                <select
                  id={`${key}-${timeIndex}-start`}
                  aria-label={`Hora de início, ${label}`}
                  value={time.start || ""}
                  onChange={(event) =>
                    updateTime(
                      key,
                      timeIndex,
                      "start",
                      event.target.value
                    )
                  }
                  required
                  className="h-11 min-w-0 rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
                >
                  <option value="">Início</option>

                  {startOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <span className="text-sm text-gray-500">
                  até
                </span>

                <label
                  className="sr-only"
                  htmlFor={`${key}-${timeIndex}-end`}
                >
                  Fim de {label.toLowerCase()}
                </label>

                <select
                  id={`${key}-${timeIndex}-end`}
                  aria-label={`Hora de fim, ${label}`}
                  value={time.end || ""}
                  onChange={(event) =>
                    updateTime(
                      key,
                      timeIndex,
                      "end",
                      event.target.value
                    )
                  }
                  disabled={!time.start}
                  required
                  className="h-11 min-w-0 rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">Fim</option>

                  {endOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    updateDay(key, (times) =>
                      times.filter(
                        (_, index) => index !== timeIndex
                      )
                    )
                  }
                  className="h-9 w-9 rounded-lg text-red-600 hover:bg-red-50"
                  aria-label={`Remover horário ${
                    timeIndex + 1
                  } de ${label}`}
                >
                  ✕
                </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    ))}

    <section className="border-t border-gray-200 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-800">Exceções</h3>
          <p className="text-sm text-gray-500">
            Feche este horário durante férias, obras ou outros períodos.
          </p>
        </div>
        <button
          type="button"
          onClick={addException}
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          + Adicionar exceção
        </button>
      </div>

      {schedule.exceptions.length === 0 ? (
        <p className="text-sm text-gray-500">Sem exceções definidas.</p>
      ) : (
        <div className="space-y-3">
          {schedule.exceptions.map((exception, exceptionIndex) => (
            <div
              key={`exception-${exceptionIndex}`}
              className="grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_2fr_auto]"
            >
              <div>
                <label
                  className="mb-1 block text-sm text-gray-600"
                  htmlFor={`exception-${exceptionIndex}-start`}
                >
                  Data de início
                </label>
                <input
                  id={`exception-${exceptionIndex}-start`}
                  type="date"
                  value={exception.startDate}
                  onChange={(event) =>
                    updateException(
                      exceptionIndex,
                      "startDate",
                      event.target.value
                    )
                  }
                  max={exception.endDate || undefined}
                  required
                  className="h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm text-gray-600"
                  htmlFor={`exception-${exceptionIndex}-end`}
                >
                  Data de fim
                </label>
                <input
                  id={`exception-${exceptionIndex}-end`}
                  type="date"
                  value={exception.endDate}
                  onChange={(event) =>
                    updateException(
                      exceptionIndex,
                      "endDate",
                      event.target.value
                    )
                  }
                  min={exception.startDate || undefined}
                  required
                  className="h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm text-gray-600"
                  htmlFor={`exception-${exceptionIndex}-reason`}
                >
                  Motivo
                </label>
                <input
                  id={`exception-${exceptionIndex}-reason`}
                  type="text"
                  value={exception.reason}
                  onChange={(event) =>
                    updateException(
                      exceptionIndex,
                      "reason",
                      event.target.value
                    )
                  }
                  maxLength={200}
                  placeholder="Ex.: Férias"
                  required
                  className="h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 outline-none focus:border-red-500"
                />
              </div>

              <button
                type="button"
                onClick={() => removeException(exceptionIndex)}
                className="h-11 rounded-lg px-3 text-red-600 hover:bg-red-50"
                aria-label={`Remover exceção ${exceptionIndex + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  </div>

  <div className="flex justify-end gap-2 border-t p-6">
    <button
      type="button"
      onClick={() => setShowModal(false)}
      disabled={isSaving}
      className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300"
    >
      Cancelar
    </button>

    <button
      type="submit"
      disabled={isSaving}
      className={`rounded-lg px-4 py-2 ${
        isSaving
          ? "cursor-not-allowed bg-gray-300 text-gray-500"
          : "bg-red-500 text-white hover:bg-red-600"
      }`}
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