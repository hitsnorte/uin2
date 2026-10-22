import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toFlag(value) {
  return value === true || value === "1" ? "1" : "0";
}

export async function GET(req, context) {
  const params = await context.params;
  const id = Number(params.id);

  if (!id) {
    return Response.json({ error: "Missing item id" }, { status: 400 });
  }

  const item = await prisma.items.findUnique({
    where: { item_id: id },
  });

  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  return Response.json(item);
}

export async function PUT(req, context) {
  const params = await context.params;

  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.items.update({
    where: { item_id: id },
    data: {
      item_name1: body.item_name1,
      item_name2: body.item_name2 ?? null,
      item_name3: body.item_name3 ?? null,
      item_name4: body.item_name4 ?? null,
      item_name5: body.item_name5 ?? null,
      item_cat_id: body.item_cat_id ? Number(body.item_cat_id) : null,
      preparation: body.preparation ? JSON.stringify(body.preparation) : null,
      item_description1: body.item_description1 ?? null,
      item_description2: body.item_description2 ?? null,
      item_description3: body.item_description3 ?? null,
      item_description4: body.item_description4 ?? null,
      item_description5: body.item_description5 ?? null,
      item_image_url: body.item_image_url ?? null,
      item_price:
        body.item_price != null && body.item_price !== ""
          ? String(body.item_price).trim()
          : null,
      visiblePrice: toFlag(body.visiblePrice),
      item_type: body.item_type ?? null,
      allowReservations: toFlag(body.allowReservations),
      scheduleID: body.scheduleID ? String(body.scheduleID).trim() : null,
      reservation: toFlag(body.reservation),
      checkin: toFlag(body.checkin),
      room: toFlag(body.room),
      instantOrder: toFlag(body.instantOrder),
      sendStaychat: toFlag(body.sendStaychat),
      staychatWebhook: body.staychatWebhook ?? null,
    },
  });

  return Response.json(updated);
}
// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.items.delete({
    where: { item_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}