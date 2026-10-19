import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const { id } = await context.params;
  const body = await req.json();
  const updated = await prisma.accessPointSubGroups.update({
    where: { access_point_sub_group_id: Number(id) },
    data: {
      access_point_group_id: body.access_point_group_id
        ? Number(body.access_point_group_id)
        : null,
      access_point_group_name: body.access_point_group_name || null,
    },
  });
  return Response.json(updated);
}

export async function DELETE(req, context) {
  const { id } = await context.params;
  await prisma.accessPointSubGroups.delete({
    where: { access_point_sub_group_id: Number(id) },
  });
  return Response.json({ ok: true });
}
