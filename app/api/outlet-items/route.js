import { prisma } from "@/lib/prisma";

function toPrice(value) {
  if (value == null || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const outletId = Number(body?.outlet_id);
    const itemId = Number(body?.item_id);
    if (
      !Number.isSafeInteger(outletId) ||
      outletId <= 0 ||
      !Number.isSafeInteger(itemId) ||
      itemId <= 0
    ) {
      return Response.json(
        { error: "Indique um outlet e um item válidos." },
        { status: 400 }
      );
    }

    const [outlet, item] = await Promise.all([
      prisma.outlets.findUnique({
        where: { outlet_id: outletId },
        select: { outlet_id: true },
      }),
      prisma.items.findUnique({ where: { item_id: itemId } }),
    ]);
    if (!outlet || !item) {
      return Response.json(
        { error: "Outlet ou item não encontrado." },
        { status: 404 }
      );
    }

    const existing = await prisma.outletItems.findFirst({
      where: {
        outlet_id: outletId,
        item_id: itemId,
        is_reservation_item: false,
      },
    });
    if (existing) return Response.json(existing);

    const created = await prisma.outletItems.create({
      data: {
        item_id: item.item_id,
        outlet_id: outlet.outlet_id,
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
        item_price: toPrice(item.item_price),
        item_vat: item.item_vat,
        reservation: item.reservation,
        checkin: item.checkin,
        room: item.room,
        instantOrder: item.instantOrder,
        sendStaychat: item.sendStaychat,
        staychatWebhook: item.staychatWebhook,
        visiblePrice: item.visiblePrice,
        allowReservations: item.allowReservations,
        scheduleID: item.scheduleID,
        preparation: item.preparation,
        takeaway_order: item.takeaway_order,
        cart: item.cart,
        order: item.order,
      },
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar snapshot do item no outlet:", error);
    return Response.json(
      { error: "Não foi possível guardar o item no outlet." },
      { status: 500 }
    );
  }
}
