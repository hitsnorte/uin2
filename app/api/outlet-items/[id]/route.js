import { prisma } from "@/lib/prisma";
import { getReservationShifts } from "@/lib/reservationShifts";

function isEnabled(value) {
  return value === true || value === 1 || value === "1";
}

export async function PATCH(request, context) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return Response.json({ error: "ID do item inválido." }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Dados do item inválidos." }, { status: 400 });
    }

    const currentItem = await prisma.outletItems.findFirst({
      where: { outlet_item_id: id, is_reservation_item: true },
    });
    if (!currentItem) {
      return Response.json({ error: "Item do outlet não encontrado." }, { status: 404 });
    }
    const outlet = await prisma.outlets.findUnique({
      where: { outlet_id: currentItem.outlet_id },
      select: { schedule_id: true },
    });
    if (!outlet) {
      return Response.json({ error: "Outlet não encontrado." }, { status: 404 });
    }

    if (typeof body.item_name1 !== "string" || !body.item_name1.trim()) {
      return Response.json({ error: "Indique o nome do item." }, { status: 400 });
    }
    if (body.item_name1.trim().length > 150) {
      return Response.json({ error: "O nome não pode exceder 150 caracteres." }, { status: 400 });
    }

    const price = body.item_price === "" || body.item_price == null
      ? null
      : Number(body.item_price);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return Response.json({ error: "Indique um preço válido." }, { status: 400 });
    }

    const vat = body.item_vat === "" || body.item_vat == null
      ? null
      : Number(body.item_vat);
    if (vat !== null && (!Number.isFinite(vat) || vat < 0 || vat > 100)) {
      return Response.json(
        { error: "O IVA deve ser uma percentagem entre 0 e 100." },
        { status: 400 }
      );
    }

    const duration = Number(body.item_duration);
    if (!Number.isSafeInteger(duration) || duration <= 0) {
      return Response.json(
        { error: "A duração deve ser um número inteiro positivo." },
        { status: 400 }
      );
    }

    const shiftIndex = Number(body.shift_index);
    const schedule = outlet.schedule_id
      ? await prisma.schedules.findUnique({
          where: { schedule_id: outlet.schedule_id },
          select: { schedule_json: true },
        })
      : null;
    const shifts = getReservationShifts(schedule?.schedule_json);
    if (!shifts.some((shift) => shift.shift_index === shiftIndex)) {
      return Response.json(
        { error: "Selecione um turno válido no horário do outlet." },
        { status: 400 }
      );
    }

    const updated = await prisma.outletItems.update({
      where: { outlet_item_id: id },
      data: {
        item_name1: body.item_name1.trim(),
        item_price: price,
        item_vat: vat == null ? null : String(vat),
        item_duration: duration,
        shift_index: shiftIndex,
        reservation: isEnabled(body.reservation) ? "1" : "0",
        takeaway_order: isEnabled(body.takeaway_order),
        cart: isEnabled(body.cart),
        order: isEnabled(body.order),
        checkin: isEnabled(body.checkin) ? "1" : "0",
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Não foi possível guardar este item do outlet." },
      { status: 500 }
    );
  }
}
