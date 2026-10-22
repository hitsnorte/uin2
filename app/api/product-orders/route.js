import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
  const { productId, quantity } = await req.json();
  const id = Number(productId);
  const orderQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

  if (!id) {
    return NextResponse.json({ error: "Missing item id" }, { status: 400 });
  }

  const item = await prisma.items.findUnique({
    where: { item_id: id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.sendStaychat !== "1" || !item.staychatWebhook) {
    return NextResponse.json(
      { error: "Stay Chat is not enabled for this item" },
      { status: 400 }
    );
  }

  const itemName = item.item_name1 || "Item sem nome";
  const price = Number(item.item_price || 0).toFixed(2);

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
                    id: `item-order-${item.item_id}-${Date.now()}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: {
                        body: `Pedido: ${orderQuantity}x ${itemName} - ${price} €`,
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
    return NextResponse.json(
      { error: "Webhook rejected the order" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
