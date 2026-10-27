import { getReservationShifts } from "@/lib/reservationShifts";

export async function validateOutletReservationItems(
  prisma,
  assignments,
  scheduleId
) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return {
      error: "Adicione pelo menos um item de reserva de mesa.",
    };
  }

  const uniqueItemIds = new Set();
  for (const assignment of assignments) {
    const itemId = Number(assignment?.item_id);
    const shiftIndex = Number(assignment?.shift_index);

    if (
      !Number.isSafeInteger(itemId) ||
      itemId <= 0 ||
      !Number.isSafeInteger(shiftIndex) ||
      shiftIndex < 0
    ) {
      return { error: "A lista de itens de reserva de mesa é inválida." };
    }

    uniqueItemIds.add(itemId);
  }

  const schedule = await prisma.schedules.findUnique({
    where: { schedule_id: Number(scheduleId) },
    select: { schedule_json: true },
  });
  const shifts = getReservationShifts(schedule?.schedule_json);
  if (!schedule || shifts.length === 0) {
    return { error: "O horário selecionado não tem turnos configurados." };
  }

  const validShiftIndexes = new Set(shifts.map((shift) => shift.shift_index));
  if (
    assignments.some(
      (assignment) => !validShiftIndexes.has(Number(assignment.shift_index))
    )
  ) {
    return { error: "Selecione um turno válido para cada item." };
  }

  const itemIds = [...uniqueItemIds];
  const items = await prisma.items.findMany({
    where: {
      item_id: { in: itemIds },
      item_type: "Reserva de mesa",
    },
  });
  if (items.length !== itemIds.length) {
    return {
      error: "Todos os itens devem ser do tipo Reserva de mesa.",
    };
  }

  const itemsById = new Map(items.map((item) => [item.item_id, item]));
  const normalizedItems = assignments.map((assignment) => {
    const item = itemsById.get(Number(assignment.item_id));
    const hasSnapshotValue = (field) =>
      Object.prototype.hasOwnProperty.call(assignment, field);
    return {
      ...item,
      item_name1:
        typeof assignment.item_name1 === "string"
          ? assignment.item_name1.trim()
          : item.item_name1,
      item_price: hasSnapshotValue("item_price")
        ? assignment.item_price === "" || assignment.item_price == null
          ? null
          : assignment.item_price
        : item.item_price,
      item_vat: hasSnapshotValue("item_vat")
        ? assignment.item_vat === "" || assignment.item_vat == null
          ? null
          : String(assignment.item_vat)
        : item.item_vat,
      item_duration:
        assignment.item_duration == null || assignment.item_duration === ""
          ? item.item_duration
          : Number(assignment.item_duration),
      reservation:
        assignment.reservation === undefined
          ? item.reservation
          : assignment.reservation === true ||
              assignment.reservation === 1 ||
              assignment.reservation === "1",
      takeaway_order:
        assignment.takeaway_order === true ||
        assignment.takeaway_order === 1 ||
        assignment.takeaway_order === "1",
      cart:
        assignment.cart === true ||
        assignment.cart === 1 ||
        assignment.cart === "1",
      order:
        assignment.order === true ||
        assignment.order === 1 ||
        assignment.order === "1",
      checkin:
        assignment.checkin === undefined
          ? item.checkin
          : assignment.checkin === true ||
              assignment.checkin === 1 ||
              assignment.checkin === "1",
      shift_index: Number(assignment.shift_index),
    };
  });

  if (
    normalizedItems.some(
      (item) =>
        !item.item_name1 ||
        item.item_name1.length > 150 ||
        !Number.isSafeInteger(Number(item.item_duration)) ||
        Number(item.item_duration) <= 0 ||
        (item.item_price != null &&
          item.item_price !== "" &&
          (!Number.isFinite(Number(item.item_price)) ||
            Number(item.item_price) < 0)) ||
        (item.item_vat != null &&
          item.item_vat !== "" &&
          (!Number.isFinite(Number(item.item_vat)) ||
            Number(item.item_vat) < 0 ||
            Number(item.item_vat) > 100))
    )
  ) {
    return {
      error: "Verifique o nome, preço, IVA e duração dos itens de reserva.",
    };
  }

  return { items: normalizedItems };
}

export function buildOutletItemSnapshot(item, outletId, scheduleId) {
  return {
    item_id: item.item_id,
    outlet_id: outletId,
    item_vat: item.item_vat,
    item_duration: item.item_duration,
    schedule_id: scheduleId,
    shift_index: item.shift_index,
    is_reservation_item: true,
    cart: Boolean(item.cart),
    takeaway_order: Boolean(item.takeaway_order),
    order: Boolean(item.order),
    item_name1: item.item_name1,
    item_name2: item.item_name2,
    item_name3: item.item_name3,
    item_name4: item.item_name4,
    item_name5: item.item_name5,
    item_description1: item.item_description1,
    item_description2: item.item_description2,
    item_description3: item.item_description3,
    item_description4: item.item_description4,
    item_description5: item.item_description5,
    item_image_url: item.item_image_url,
    item_type: item.item_type,
    item_price:
      item.item_price != null &&
      item.item_price !== "" &&
      Number.isFinite(Number(item.item_price))
        ? Number(item.item_price)
        : null,
    reservation: item.reservation === true || item.reservation === "1" ? "1" : "0",
    checkin: item.checkin === true || item.checkin === "1" ? "1" : "0",
    room: item.room,
    instantOrder: item.instantOrder,
    sendStaychat: item.sendStaychat,
    staychatWebhook: item.staychatWebhook,
    visiblePrice: item.visiblePrice,
    allowReservations: item.allowReservations,
    scheduleID: item.scheduleID,
    preparation: item.preparation,
  };
}
