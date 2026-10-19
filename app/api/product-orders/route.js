import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
  const { productId, quantity } = await req.json();
  const id = Number(productId);
  const orderQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

  if (!id) {
    return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  }

  const product = await prisma.products.findUnique({
    where: { product_id: id },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.sendStaychat !== "1" || !product.staychatWebhook) {
    return NextResponse.json(
      { error: "Stay Chat is not enabled for this product" },
      { status: 400 }
    );
  }

  const productName = product.product_name1 || "Item sem nome";
  const price = Number(product.product_price || 0).toFixed(2);

  const webhookResponse = await fetch(product.staychatWebhook, {
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
                    id: `product-order-${product.product_id}-${Date.now()}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: {
                        body: `Pedido: ${orderQuantity}x ${productName} - ${price} €`,
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
