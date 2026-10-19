import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toFlag(value) {
  return value === true || value === "1" ? "1" : "0";
}

// GET all
export async function GET() {
  const data = await prisma.products.findMany();
  return Response.json(data);
}

// CREATE
export async function POST(req) {
  const body = await req.json();

  const created = await prisma.products.create({
    data: {
      product_name1: body.product_name1,
      product_name2: body.product_name2 ?? null,
      product_name3: body.product_name3 ?? null,
      product_name4: body.product_name4 ?? null,
      product_name5: body.product_name5 ?? null,
      product_description1: body.product_description1 ?? null,
      product_description2: body.product_description2 ?? null,
      product_description3: body.product_description3 ?? null,
      product_description4: body.product_description4 ?? null,
      product_description5: body.product_description5 ?? null,
      product_image_url: body.product_image_url ?? null,
      product_price:
        body.product_price != null && body.product_price !== ""
          ? String(body.product_price).trim()
          : null,
      visiblePrice: toFlag(body.visiblePrice),
      product_type: body.product_type ?? null,
      allowReservations: toFlag(body.allowReservations),
      scheduleID: body.scheduleID ? String(body.scheduleID).trim() : null,
      reservation: toFlag(body.reservation),
      checkin: toFlag(body.checkin),
      room: toFlag(body.room),
      instantOrder: toFlag(body.instantOrder),
      sendStaychat: toFlag(body.sendStaychat),
      staychatWebhook: body.staychatWebhook ?? null,
      product_cat_id: body.product_cat_id ? Number(body.product_cat_id) : null,
      preparation: body.preparation ? JSON.stringify(body.preparation) : null,
    },
  });

  return Response.json(created);
}