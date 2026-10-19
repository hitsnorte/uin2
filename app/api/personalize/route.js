import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET (buscar config)
export async function GET() {
  const data = await prisma.personalize.findFirst();
  return Response.json(data);
}

// CREATE or UPDATE
export async function POST(req) {
  const body = await req.json();

  const existing = await prisma.personalize.findFirst();

  if (existing) {
    const updated = await prisma.personalize.update({
      where: { personalize_id: existing.personalize_id },
      data: body,
    });

    return Response.json(updated);
  }

  const created = await prisma.personalize.create({
    data: body,
  });

  return Response.json(created);
}