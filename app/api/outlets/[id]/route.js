import { prisma } from "@/lib/prisma";

// UPDATE
export async function PUT(req, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const updated = await prisma.outlets.update({
      where: {
        outlet_id: id,
      },
      data: {
        outlet_name1: body.outlet_name1 || null,
        outlet_name2: body.outlet_name2 || null,
        outlet_name3: body.outlet_name3 || null,
        outlet_name4: body.outlet_name4 || null,
        outlet_name5: body.outlet_name5 || null,
        // outlet_type: Number(body.outlet_type) || 1,
        area_id: Number(body.area_id),
        visible: body.visible ?? true,
        outlet_card_background: body.outlet_card_background || null,
      },
    });

    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(_, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    await prisma.outlets.delete({
      where: {
        outlet_id: id,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}