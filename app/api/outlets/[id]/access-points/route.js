import {
  getOutletAccessLayout,
  saveOutletAccessLayout,
} from "@/lib/outletAccessPoints";

async function getOutletId(context) {
  const params = await context.params;
  const outletId = Number(params.id);

  return Number.isInteger(outletId) && outletId > 0 ? outletId : null;
}

export async function GET(_, context) {
  try {
    const outletId = await getOutletId(context);
    if (!outletId) {
      return Response.json({ error: "ID de outlet inválido" }, { status: 400 });
    }

    return Response.json(await getOutletAccessLayout(outletId));
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Não foi possível carregar os pontos de acesso do outlet." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const outletId = await getOutletId(context);
    if (!outletId) {
      return Response.json({ error: "ID de outlet inválido" }, { status: 400 });
    }

    const body = await request.json();
    return Response.json(await saveOutletAccessLayout(outletId, body.rooms));
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message || "Não foi possível guardar os pontos de acesso." },
      { status: error.status || 500 }
    );
  }
}
