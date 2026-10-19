import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all
export async function GET() {
  const data = await prisma.Languages.findMany();
  console.log(data);
  return Response.json(data);
}

// CREATE
export async function POST(req) {
  const body = await req.json();

  const created = await prisma.Languages.create({
    data: {
      lang_name: body.lang_name,
    },
  });

  return Response.json(created);
}