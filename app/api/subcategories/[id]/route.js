import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// UPDATE
export async function PUT(req, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const updated = await prisma.subcategories.update({
      where: {
        subcategory_id: id,
      },
      data: {
        subcategory_name1: body.subcategory_name1 || null,
        subcategory_name2: body.subcategory_name2 || null,
        subcategory_name3: body.subcategory_name3 || null,
        subcategory_name4: body.subcategory_name4 || null,
        subcategory_name5: body.subcategory_name5 || null,
        subcategory_type: Number(body.subcategory_type) || 1,
        category_id: Number(body.category_id),
        visible: body.visible ?? true,
        subcategory_card_background: body.subcategory_card_background || null,
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

    await prisma.subcategories.delete({
      where: {
        subcategory_id: id,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}