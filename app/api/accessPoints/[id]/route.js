import { prisma } from "@/lib/prisma";
import { syncOutletAvailability } from "@/lib/availability";

function parseJson(value) {
  if (value == null || value === "") return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function PUT(req, context) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const typologyId = Number(body.typology_id);

    if (!Number.isSafeInteger(typologyId) || typologyId <= 0) {
      return Response.json({ error: "É obrigatório selecionar uma tipologia válida." }, { status: 400 });
    }

    const typology = await prisma.typologies.findUnique({
      where: { typology_id: BigInt(typologyId) },
      select: { typology_id: true },
    });
    if (!typology) {
      return Response.json({ error: "Tipologia não encontrada." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const current = await transaction.accessPoints.findUnique({
        where: { access_point_id: Number(id) },
        select: { outlet_id: true },
      });
      const point = await transaction.accessPoints.update({
        where: { access_point_id: Number(id) },
        data: {
          access_point_name: body.access_point_name || null,
          products: parseJson(body.products),
          product_cat: parseJson(body.product_cat),
          activities: parseJson(body.activities),
          active: body.active !== false,
          typology_id: typologyId,
        },
      });

      const affectedOutletIds = new Set(
        [current?.outlet_id, point.outlet_id].filter(Number.isSafeInteger)
      );
      for (const outletId of affectedOutletIds) {
        await syncOutletAvailability(transaction, outletId);
      }

      return point;
    });
    return Response.json(updated);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Não foi possível atualizar o ponto de acesso." },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  const { id } = await context.params;
  await prisma.$transaction(async (transaction) => {
    const point = await transaction.accessPoints.findUnique({
      where: { access_point_id: Number(id) },
      select: { outlet_id: true },
    });
    await transaction.accessPoints.delete({
      where: { access_point_id: Number(id) },
    });
    if (Number.isSafeInteger(point?.outlet_id)) {
      await syncOutletAvailability(transaction, point.outlet_id);
    }
  });
  return Response.json({ ok: true });
}
