import { prisma } from "@/lib/prisma";
import { validateIvaRate } from "@/lib/ivaRates";

export async function GET() {
  const rates = await prisma.ivaRates.findMany({
    orderBy: [{ country_code: "asc" }, { name: "asc" }],
  });

  return Response.json(rates);
}

export async function POST(request) {
  const validation = validateIvaRate(await request.json());

  if (validation.error) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const created = await prisma.ivaRates.create({
    data: validation.data,
  });

  return Response.json(created, { status: 201 });
}
