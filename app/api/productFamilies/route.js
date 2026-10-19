import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all
export async function GET() {
  const data = await prisma.ProductFamily.findMany();
  console.log(data);
  return Response.json(data);
}

// CREATE
export async function POST(req) {
  const body = await req.json();

  const created = await prisma.ProductFamily.create({
    data: {
      product_family_name: body.product_family_name,
      product_group_id: body.product_group_id ? Number(body.product_group_id) : null
    },
  });

  return Response.json(created);
}