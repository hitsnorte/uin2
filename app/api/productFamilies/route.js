import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all
export async function GET() {
  const data = await prisma.itemFamily.findMany();
  console.log(data);
  return Response.json(data);
}

// CREATE
export async function POST(req) {
  const body = await req.json();

  const created = await prisma.itemFamily.create({
    data: {
      item_family_name: body.item_family_name,
      item_group_id: body.item_group_id ? Number(body.item_group_id) : null
    },
  });

  return Response.json(created);
}