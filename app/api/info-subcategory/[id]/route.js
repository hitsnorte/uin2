import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  const { id } = await params;

  const data = await prisma.infoSubcategory.findFirst({
    where: {
      subcategory_id: Number(id),
    },
  });

  return Response.json(data);
}