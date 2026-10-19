import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all
export async function GET() {
  const data = await prisma.Areas.findMany();
  return Response.json(data);
}

// CREATE
export async function POST(req) {
  const body = await req.json();

  const created = await prisma.Areas.create({
    data: {
      area_name1: body.area_name1 || null,
      area_name2: body.area_name2 || null,
      area_name3: body.area_name3 || null,
      area_name4: body.area_name4 || null,
      area_name5: body.area_name5 || null,
      visible: true,
      area_card_background: body.area_card_background || null,
    },
  });

  return Response.json(created);
}