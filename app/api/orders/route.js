import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [orders, statuses] = await Promise.all([
      prisma.orders.findMany({
        include: {
          OrderStatus: {
            select: {
              order_status_id: true,
              order_status_name: true,
            },
          },
        },
        orderBy: [{ created_at: "desc" }, { order_id: "desc" }],
      }),
      prisma.orderStatus.findMany({
        select: {
          order_status_id: true,
          order_status_name: true,
        },
        orderBy: { order_status_id: "asc" },
      }),
    ]);

    return Response.json({ orders, statuses });
  } catch (error) {
    console.error("Não foi possível carregar os pedidos:", error);
    return Response.json(
      { error: "Não foi possível carregar os pedidos." },
      { status: 500 }
    );
  }
}
