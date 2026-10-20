import { prisma } from "@/lib/prisma";

async function getOutletId(context) {
  const params = await context.params;
  const outletId = Number(params.id);

  return Number.isInteger(outletId) && outletId > 0 ? outletId : null;
}

export async function GET(_, context) {
  try {
    const outletId = await getOutletId(context);
    if (!outletId) {
      return Response.json({ error: "ID de outlet inválido" }, { status: 400 });
    }

    const groups = await prisma.accessPointGroups.findMany({
      where: { outlet_id: outletId },
      orderBy: { access_point_group_id: "asc" },
    });

    const rooms = await Promise.all(
      groups.map(async (group) => ({
        group,
        points: await prisma.accessPoints.findMany({
          where: {
            outlet_id: outletId,
            access_point_group_id: group.access_point_group_id,
          },
          orderBy: { access_point_id: "asc" },
        }),
      }))
    );

    return Response.json({ rooms });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const outletId = await getOutletId(context);
    if (!outletId) {
      return Response.json({ error: "ID de outlet inválido" }, { status: 400 });
    }

    const body = await request.json();
    if (!Array.isArray(body.rooms) || body.rooms.length === 0) {
      return Response.json(
        { error: "Adicione pelo menos uma área espacial." },
        { status: 400 }
      );
    }

    const normalizedRooms = body.rooms.map((room) => ({
      id: room.id == null ? null : Number(room.id),
      name: typeof room.name === "string" ? room.name.trim() : "",
      points: Array.isArray(room.points)
        ? room.points.map((point) => ({
            id: point.id == null ? null : Number(point.id),
            name: typeof point.name === "string" ? point.name.trim() : "",
          }))
        : null,
    }));

    if (
      normalizedRooms.some(
        (room) =>
          !room.name ||
          (room.id !== null &&
            (!Number.isInteger(room.id) || room.id <= 0)) ||
          !Array.isArray(room.points) ||
          room.points.some(
            (point) =>
              !point.name ||
              (point.id !== null &&
                (!Number.isInteger(point.id) || point.id <= 0))
          )
      )
    ) {
      return Response.json(
        { error: "Cada área espacial e ponto de acesso precisa de um nome válido." },
        { status: 400 }
      );
    }

    const roomIds = normalizedRooms
      .map((room) => room.id)
      .filter((id) => id !== null);
    const pointIds = normalizedRooms
      .flatMap((room) => room.points)
      .map((point) => point.id)
      .filter((id) => id !== null);

    if (
      new Set(roomIds).size !== roomIds.length ||
      new Set(pointIds).size !== pointIds.length
    ) {
      return Response.json(
        { error: "As áreas e os pontos de acesso não podem estar duplicados." },
        { status: 400 }
      );
    }

    const savedLayout = await prisma.$transaction(async (transaction) => {
      const outlet = await transaction.outlets.findUnique({
        where: { outlet_id: outletId },
        select: { outlet_id: true },
      });

      if (!outlet) {
        throw new Error("Outlet não encontrado.");
      }

      const existingGroups = await transaction.accessPointGroups.findMany({
        where: { outlet_id: outletId },
        orderBy: { access_point_group_id: "asc" },
      });
      const existingGroupIds = new Set(
        existingGroups.map((group) => group.access_point_group_id)
      );
      const existingPoints = await transaction.accessPoints.findMany({
        where: {
          outlet_id: outletId,
        },
        select: { access_point_id: true, access_point_group_id: true },
      });
      const existingPointById = new Map(
        existingPoints.map((point) => [point.access_point_id, point])
      );

      if (
        roomIds.some((id) => !existingGroupIds.has(id)) ||
        pointIds.some((id) => !existingPointById.has(id))
      ) {
        throw new Error("Uma área ou ponto de acesso não pertence a este outlet.");
      }

      const retainedPointIds = new Set(pointIds);
      const removedPointIds = existingPoints
        .map((point) => point.access_point_id)
        .filter((pointId) => !retainedPointIds.has(pointId));

      if (removedPointIds.length > 0) {
        await transaction.accessPoints.deleteMany({
          where: { access_point_id: { in: removedPointIds } },
        });
      }

      const retainedGroupIds = new Set(roomIds);
      const removedGroupIds = existingGroups
        .map((group) => group.access_point_group_id)
        .filter((groupId) => !retainedGroupIds.has(groupId));

      if (removedGroupIds.length > 0) {
        await transaction.accessPointGroups.deleteMany({
          where: { access_point_group_id: { in: removedGroupIds } },
        });
      }

      const savedRooms = [];
      for (const room of normalizedRooms) {
        const group = room.id === null
          ? await transaction.accessPointGroups.create({
              data: {
                access_point_group_name: room.name,
                outlet_id: outletId,
              },
            })
          : await transaction.accessPointGroups.update({
              where: { access_point_group_id: room.id },
              data: { access_point_group_name: room.name },
            });

        for (const point of room.points) {
          if (point.id === null) {
            await transaction.accessPoints.create({
              data: {
                access_point_name: point.name,
                access_point_group_id: group.access_point_group_id,
                outlet_id: outletId,
                active: true,
              },
            });
          } else {
            await transaction.accessPoints.update({
              where: { access_point_id: point.id },
              data: {
                access_point_name: point.name,
                access_point_group_id: group.access_point_group_id,
              },
            });
          }
        }

        const savedPoints = await transaction.accessPoints.findMany({
          where: {
            outlet_id: outletId,
            access_point_group_id: group.access_point_group_id,
          },
          orderBy: { access_point_id: "asc" },
        });

        savedRooms.push({ group, points: savedPoints });
      }

      return { rooms: savedRooms };
    });

    return Response.json(savedLayout);
  } catch (error) {
    console.error(error);
    const status = error.message === "Outlet não encontrado." ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
