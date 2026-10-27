import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("userFOSession")?.value;
    if (!sessionToken) {
      return Response.json(
        { error: "Inicie sessão no frontoffice para fazer um pedido." },
        { status: 401 }
      );
    }

    const user = await prisma.users_FO.findFirst({
      where: {
        session_token: sessionToken,
        session_expires_at: { gt: new Date() },
      },
      select: { id: true, email: true },
    });
    if (!user) {
      return Response.json(
        { error: "A sessão expirou. Inicie sessão para fazer um pedido." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Dados do pedido inválidos." }, { status: 400 });
    }

    const outletItemId = Number(body?.outletItemId);
    const legacyItemId = Number(body?.productId);
    const item =
      Number.isSafeInteger(outletItemId) && outletItemId > 0
        ? await prisma.outletItems.findUnique({
            where: { outlet_item_id: outletItemId },
          })
        : Number.isSafeInteger(legacyItemId) && legacyItemId > 0
          ? await prisma.items.findUnique({
              where: { item_id: legacyItemId },
            })
          : null;

    if (!item || ("is_reservation_item" in item && item.is_reservation_item)) {
      return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    if (![true, 1, "1"].includes(item.order)) {
      return Response.json(
        { error: "Este produto não está disponível para pedido." },
        { status: 400 }
      );
    }

    const status = await prisma.orderStatus.upsert({
      where: { order_status_id: 1 },
      update: {},
      create: {
        order_status_id: 1,
        order_status_name: "Novo",
      },
      select: { order_status_id: true },
    });

    const itemName = item.item_name1 || "Item sem nome";
    const order = await prisma.orders.create({
      data: {
        order_name: itemName.slice(0, 150),
        customer_name: (user.email || `Utilizador ${user.id}`).slice(0, 150),
        order_status: status.order_status_id,
      },
      select: { order_id: true },
    });

    let notificationWarning = null;
    if (item.sendStaychat === "1" && item.staychatWebhook) {
      const price = Number(item.item_price || 0).toFixed(2);
      try {
        const webhookResponse = await fetch(item.staychatWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            object: "whatsapp_business_account",
            entry: [
              {
                changes: [
                  {
                    value: {
                      messages: [
                        {
                          from: "351912906080",
                          id: `item-order-${order.order_id}-${Date.now()}`,
                          timestamp: String(Math.floor(Date.now() / 1000)),
                          type: "text",
                          text: {
                            body: `Pedido: 1x ${itemName} - ${price} €`,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!webhookResponse.ok) {
          console.error(
            `Webhook rejeitou a notificação do pedido ${order.order_id} (${webhookResponse.status}).`
          );
          notificationWarning =
            " O pedido ficou registado, mas não foi possível notificar o estabelecimento.";
        }
      } catch (error) {
        console.error(
          `Não foi possível notificar o estabelecimento sobre o pedido ${order.order_id}:`,
          error
        );
        notificationWarning =
          " O pedido ficou registado, mas não foi possível notificar o estabelecimento.";
      }
    }

    return Response.json(
      { ok: true, orderId: order.order_id, notificationWarning },
      { status: 201 }
    );
  } catch (error) {
    console.error("Não foi possível registar o pedido:", error);
    return Response.json(
      { error: "Não foi possível registar o pedido." },
      { status: 500 }
    );
  }
}
