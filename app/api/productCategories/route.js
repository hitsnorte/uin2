import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all
export async function GET() {
  const data = await prisma.productCats.findMany();
  return Response.json(data);
}

// CREATE
export async function POST(req) {
  const body = await req.json();

  const created = await prisma.productCats.create({
    data: {
      category_name1: body.category_name1,
      category_name2: body.category_name2 ?? null,
      category_name3: body.category_name3 ?? null,
      category_name4: body.category_name4 ?? null,
      category_name5: body.category_name5 ?? null,
      product_family_id: body.product_family_id ? Number(body.product_family_id) : null,
    },
  });

  return Response.json(created);
}