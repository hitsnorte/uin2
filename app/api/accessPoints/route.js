import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseJson(value) {
  if (value == null || value === "") return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function GET() {
  const data = await prisma.accessPoints.findMany({
    orderBy: { access_point_id: "asc" },
  });
  return Response.json(data);
}

export async function POST(req) {
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

    const created = await prisma.accessPoints.create({
      data: {
        access_point_name: body.access_point_name || null,
        products: parseJson(body.products),
        product_cat: parseJson(body.product_cat),
        activities: parseJson(body.activities),
        active: body.active !== false,
        typology_id: typologyId,
      },
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Não foi possível criar o ponto de acesso." },
      { status: 500 }
    );
  }
}
