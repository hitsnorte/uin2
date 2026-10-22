import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toFlag(value) {
  return value === true || value === "1" ? "1" : "0";
}

// GET all
export async function GET() {
  const data = await prisma.items.findMany();
  return Response.json(data);
}

// CREATE
export async function POST(req) {
  const body = await req.json();

  const created = await prisma.items.create({
    data: {
      item_name1: body.item_name1,
      item_name2: body.item_name2 ?? null,
      item_name3: body.item_name3 ?? null,
      item_name4: body.item_name4 ?? null,
      item_name5: body.item_name5 ?? null,
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
      item_cat_id: body.item_cat_id ? Number(body.item_cat_id) : null,
      preparation: body.preparation ? JSON.stringify(body.preparation) : null,
    },
  });

  return Response.json(created);
}