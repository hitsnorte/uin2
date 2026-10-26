import { prisma } from "@/lib/prisma";

function serializeTypology(typology) {
  return {
    typology_id: typology.typology_id.toString(),
    outlet_id: typology.outlet_id,
    name: typology.name,
    outlet_name: typology.Outlets.outlet_name1,
  };
}

// GET ALL
export async function GET() {
  try {
    const typologies = await prisma.typologies.findMany({
      include: {
        Outlets: {
          select: {
            outlet_name1: true,
          },
        },
      },
      orderBy: [{ outlet_id: "asc" }, { name: "asc" }],
    });

    return Response.json(typologies.map(serializeTypology));
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Não foi possível carregar as tipologias." },
      { status: 500 }
    );
  }
}

// CREATE
export async function POST(req) {
  let body;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const outletId = Number(body.outlet_id);

  if (!name || name.length > 100) {
    return Response.json(
      { error: "O nome é obrigatório e deve ter até 100 caracteres." },
      { status: 400 }
    );
  }

  if (!Number.isSafeInteger(outletId) || outletId <= 0) {
    return Response.json({ error: "Outlet inválido." }, { status: 400 });
  }

  try {
    const outlet = await prisma.outlets.findUnique({
      where: { outlet_id: outletId },
      select: { outlet_id: true },
    });

    if (!outlet) {
      return Response.json({ error: "Outlet não encontrado." }, { status: 404 });
    }

    const typology = await prisma.typologies.create({
      data: {
        name,
        outlet_id: outletId,
      },
      include: {
        Outlets: {
          select: {
            outlet_name1: true,
          },
        },
      },
    });

    return Response.json(serializeTypology(typology), { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return Response.json(
        { error: "Já existe uma tipologia com este nome neste outlet." },
        { status: 409 }
      );
    }

    console.error(error);
    return Response.json(
      { error: "Não foi possível criar a tipologia." },
      { status: 500 }
    );
  }
}
