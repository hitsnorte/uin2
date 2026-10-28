import { prisma } from "@/lib/prisma";

export async function PUT(request, context) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return Response.json({ error: "Tipologia inválida." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const seats = Number(body.seats);
  if (!name || name.length > 100) {
    return Response.json(
      { error: "O nome é obrigatório e deve ter até 100 caracteres." },
      { status: 400 }
    );
  }
  if (!Number.isSafeInteger(seats) || seats <= 0) {
    return Response.json(
      { error: "Indique um número de lugares válido para a tipologia." },
      { status: 400 }
    );
  }

  try {
    const typology = await prisma.typologies.update({
      where: { typology_id: BigInt(id) },
      data: { name, seats },
      include: {
        Outlets: { select: { outlet_name1: true } },
      },
    });

    return Response.json({
      typology_id: typology.typology_id.toString(),
      outlet_id: typology.outlet_id,
      name: typology.name,
      seats: typology.seats,
      outlet_name: typology.Outlets.outlet_name1,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return Response.json(
        { error: "Já existe uma tipologia com este nome neste outlet." },
        { status: 409 }
      );
    }

    if (error.code === "P2025") {
      return Response.json({ error: "Tipologia não encontrada." }, { status: 404 });
    }

    console.error(error);
    return Response.json(
      { error: "Não foi possível guardar a tipologia." },
      { status: 500 }
    );
  }
}
