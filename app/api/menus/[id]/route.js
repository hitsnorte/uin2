import { prisma } from "@/lib/prisma";

export async function PUT(req, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

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

    const data = {
      menu_name1: body.menu_name1 || null,
      menu_name2: body.menu_name2 || null,
      menu_name3: body.menu_name3 || null,
      menu_name4: body.menu_name4 || null,
      menu_name5: body.menu_name5 || null,
      outlet_id: outletId,
      menu_card_background: body.menu_card_background || null,
    };

    if (body.visible !== undefined) {
      data.visible = body.visible;
    }

    const updated = await prisma.menus.update({
      where: {
        menu_id: id,
      },
      data,
    });

    return Response.json(updated);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar menu." },
      { status: 500 }
    );
  }
}

export async function DELETE(_, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    await prisma.menus.delete({
      where: {
        menu_id: id,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao eliminar menu." },
      { status: 500 }
    );
  }
}