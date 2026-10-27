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
        select: {
          order_id: true,
          customer_name: true,
        },
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

    const customer = await prisma.users_FO.findFirst({
      where: { email: order.customer_name },
      select: { id: true },
    });
    if (!customer) {
      return Response.json(
        { error: "Não foi possível identificar o cliente deste pedido para enviar a notificação." },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const updatedOrder = await transaction.orders.update({
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

      await transaction.notifications.create({
        data: {
          user_id: customer.id,
          title: "Estado do pedido atualizado",
          message: `O estado do seu pedido #${orderId} foi atualizado para "${status.order_status_name}".`,
        },
      });

      return updatedOrder;
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
