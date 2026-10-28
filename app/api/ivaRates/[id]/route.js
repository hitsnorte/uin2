import { prisma } from "@/lib/prisma";
import { validateIvaRate } from "@/lib/ivaRates";

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request, context) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return Response.json({ error: "ID inválido." }, { status: 400 });
  }

  const validation = validateIvaRate(await request.json());

  if (validation.error) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const updated = await prisma.ivaRates.update({
      where: { iva_id: id },
      data: validation.data,
    });

    return Response.json(updated);
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json({ error: "Taxa de IVA não encontrada." }, { status: 404 });
    }

    throw error;
  }
}

export async function DELETE(_request, context) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return Response.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    await prisma.ivaRates.delete({
      where: { iva_id: id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json({ error: "Taxa de IVA não encontrada." }, { status: 404 });
    }

    throw error;
  }
}
