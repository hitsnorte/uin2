import { prisma } from "@/lib/prisma";
import {
  getOutletAccessLayout,
  saveOutletAccessLayout,
} from "@/lib/outletAccessPoints";

function parseJson(value) {
  if (value == null || value === "") return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

function getOutletIdFromRequest(request) {
  const value = new URL(request.url).searchParams.get("outlet_id");
  if (value === null) return undefined;

  const outletId = Number(value);
  return Number.isSafeInteger(outletId) && outletId > 0 ? outletId : null;
}

export async function GET(request) {
  try {
    const outletId = getOutletIdFromRequest(request);
    if (outletId === null) {
      return Response.json({ error: "ID de outlet inválido" }, { status: 400 });
    }

    if (outletId !== undefined) {
      return Response.json(await getOutletAccessLayout(outletId));
    }

    const data = await prisma.accessPoints.findMany({
      orderBy: { access_point_id: "asc" },
    });
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Não foi possível carregar os pontos de acesso." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const outletId = getOutletIdFromRequest(request);
    if (outletId === undefined || outletId === null) {
      return Response.json(
        { error: "ID de outlet inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const layout = await saveOutletAccessLayout(outletId, body.rooms);
    return Response.json(layout);
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        error: error.message || "Não foi possível guardar os pontos de acesso.",
      },
      { status: error.status || 500 }
    );
  }
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
