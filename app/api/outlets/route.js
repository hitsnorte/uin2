import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET ALL
export async function GET() {
  try {
    const data = await prisma.Outlets.findMany({
      orderBy: {
        outlet_id: "asc",
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
      outlet_name1,
      outlet_name2,
      outlet_name3,
      outlet_name4,
      outlet_name5,
      // outlet_type,
      area_id,
      outlet_card_background,
    } = body;

    if (!area_id) {
      return Response.json(
        { error: "area_id obrigatório" },
        { status: 400 }
      );
    }

    const created = await prisma.Outlets.create({
      data: {
        outlet_name1: outlet_name1 || null,
        outlet_name2: outlet_name2 || null,
        outlet_name3: outlet_name3 || null,
        outlet_name4: outlet_name4 || null,
        outlet_name5: outlet_name5 || null,
        // outlet_type: Number(outlet_type) || 1,
        area_id: Number(area_id),
        visible: true,

        // ✅ IMPORTANT: now using URL from upload endpoint
        outlet_card_background: outlet_card_background || null,
      },
    });

    return Response.json(created);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}