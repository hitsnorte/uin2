import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET ALL
export async function GET() {
  try {
    const data = await prisma.Menus.findMany({
      orderBy: {
        menu_id: "asc",
      },
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// CREATE (FIXED)
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      menu_name1,
      menu_name2,
      menu_name3,
      menu_name4,
      menu_name5,
      menu_type,
      outlet_id,
      menu_card_background,
    } = body;

    if (!outlet_id) {
      return Response.json(
        { error: "outlet_id obrigatório" },
        { status: 400 }
      );
    }

    const created = await prisma.Menus.create({
      data: {
        menu_name1: menu_name1 || null,
        menu_name2: menu_name2 || null,
        menu_name3: menu_name3 || null,
        menu_name4: menu_name4 || null,
        menu_name5: menu_name5 || null,
        menu_type: Number(menu_type) || 1,
        outlet_id: Number(outlet_id),
        visible: true,

        // ✅ IMPORTANT: now using URL from upload endpoint
        menu_card_background: menu_card_background || null,
      },
    });

    return Response.json(created);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}