import { prisma } from "@/lib/prisma";

export async function PATCH(request, context) {
  try {
    const { id: rawId } = await context.params;
    const orderId = Number(rawId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return Response.json({ error: "ID do pedido inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const statusId = Number(body?.order_status);
    if (!Number.isSafeInteger(statusId) || statusId <= 0) {
      return Response.json({ error: "Selecione um estado válido." }, { status: 400 });
    }

    const [order, status] = await Promise.all([
      prisma.orders.findUnique({
        where: { order_id: orderId },
        select: { order_id: true },
      }),
      prisma.orderStatus.findUnique({
        where: { order_status_id: statusId },
        select: {
          order_status_id: true,
          order_status_name: true,
        },
      }),
    ]);

    if (!order) {
      return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
    }
    if (!status) {
      return Response.json({ error: "Estado do pedido não encontrado." }, { status: 404 });
    }

    const updated = await prisma.orders.update({
      where: { order_id: orderId },
      data: {
        order_status: status.order_status_id,
        updated_at: new Date(),
      },
      include: {
        OrderStatus: {
          select: {
            order_status_id: true,
            order_status_name: true,
          },
        },
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("Não foi possível atualizar o estado do pedido:", error);
    return Response.json(
      { error: "Não foi possível atualizar o estado do pedido." },
      { status: 500 }
    );
  }
}
