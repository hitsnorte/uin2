import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all
export async function GET() {
  const data = await prisma.productGroup.findMany();
  console.log(data);
  return Response.json(data);
}

// CREATE
export async function POST(req) {
  const body = await req.json();

  const created = await prisma.productGroup.create({
    data: {
      product_group_name: body.product_group_name,
    },
  });

  return Response.json(created);
}