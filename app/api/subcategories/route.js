import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET ALL
export async function GET() {
  try {
    const data = await prisma.subcategories.findMany({
      orderBy: {
        subcategory_id: "asc",
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
      subcategory_name1,
      subcategory_name2,
      subcategory_name3,
      subcategory_name4,
      subcategory_name5,
      subcategory_type,
      category_id,
      subcategory_card_background,
    } = body;

    if (!category_id) {
      return Response.json(
        { error: "category_id obrigatório" },
        { status: 400 }
      );
    }

    const created = await prisma.subcategories.create({
      data: {
        subcategory_name1: subcategory_name1 || null,
        subcategory_name2: subcategory_name2 || null,
        subcategory_name3: subcategory_name3 || null,
        subcategory_name4: subcategory_name4 || null,
        subcategory_name5: subcategory_name5 || null,
        subcategory_type: Number(subcategory_type) || 1,
        category_id: Number(category_id),
        visible: true,

        // ✅ IMPORTANT: now using URL from upload endpoint
        subcategory_card_background: subcategory_card_background || null,
      },
    });

    return Response.json(created);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}