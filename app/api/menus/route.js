import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.menus.findMany({
      orderBy: {
        menu_id: "asc",
      },
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const outletId = Number(body.outlet_id);

    if (!Number.isInteger(outletId) || outletId <= 0) {
      return Response.json(
        { error: "É obrigatório selecionar um outlet válido." },
        { status: 400 }
      );
    }

    const outlet = await prisma.outlets.findUnique({
      where: { outlet_id: outletId },
      select: { outlet_id: true },
    });

    if (!outlet) {
      return Response.json(
        { error: "O outlet selecionado não existe." },
        { status: 400 }
      );
    }

    const created = await prisma.menus.create({
      data: {
        menu_name1: body.menu_name1 || null,
        menu_name2: body.menu_name2 || null,
        menu_name3: body.menu_name3 || null,
        menu_name4: body.menu_name4 || null,
        menu_name5: body.menu_name5 || null,
        outlet_id: outletId,
        visible: true,
        has_submenus:
          typeof body.has_submenus === "boolean" ? body.has_submenus : true,
        menu_card_background: body.menu_card_background || null,
      },
    });

    return Response.json(created);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao criar menu." },
      { status: 500 }
    );
  }
}