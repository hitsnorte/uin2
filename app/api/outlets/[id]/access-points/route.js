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
    const ungroupedPoints = await prisma.accessPoints.findMany({
      where: { outlet_id: outletId, access_point_group_id: null },
      orderBy: { access_point_id: "asc" },
    });
    if (ungroupedPoints.length) {
      rooms.push({
        group: {
          access_point_group_id: null,
          access_point_group_name: "Sala 1",
        },
        points: ungroupedPoints,
      });
    }
    const points = rooms.flatMap((room) =>
      room.points.map((point) => ({
        ...point,
        roomName: room.group.access_point_group_name || "Área",
      }))
    );

    return Response.json({ rooms, points });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Não foi possível carregar os pontos de acesso do outlet." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const outletId = await getOutletId(context);
    if (!outletId) {
      return Response.json({ error: "ID de outlet inválido" }, { status: 400 });
    }

    const body = await request.json();
    if (!Array.isArray(body.rooms)) {
      return Response.json(
        { error: "A lista de áreas espaciais é inválida." },
        { status: 400 }
      );
    }

    const rooms = body.rooms.map((room) => ({
      id: room.id == null ? null : Number(room.id),
      name: typeof room.name === "string" ? room.name.trim() : "",
      points: Array.isArray(room.points)
        ? room.points.map((point) => Number(point.id))
        : null,
    }));

    if (
      rooms.some(
        (room) =>
          !room.name ||
          (room.id !== null &&
            (!Number.isSafeInteger(room.id) || room.id <= 0)) ||
          !Array.isArray(room.points) ||
          room.points.some(
            (pointId) => !Number.isSafeInteger(pointId) || pointId <= 0
          )
      )
    ) {
      return Response.json(
        { error: "Cada área espacial e ponto de acesso precisa de dados válidos." },
        { status: 400 }
      );
    }

    const roomIds = rooms
      .map((room) => room.id)
      .filter((id) => id !== null);
    const pointIds = rooms.flatMap((room) => room.points);

    if (
      new Set(roomIds).size !== roomIds.length ||
      new Set(pointIds).size !== pointIds.length
    ) {
      return Response.json(
        { error: "As áreas e os pontos de acesso não podem estar duplicados." },
        { status: 400 }
      );
    }

    const savedRooms = await prisma.$transaction(async (transaction) => {
      const outlet = await transaction.outlets.findUnique({
        where: { outlet_id: outletId },
        select: { outlet_id: true },
      });
      if (!outlet) throw new Error("Outlet não encontrado.");

      const existingGroups = await transaction.accessPointGroups.findMany({
        where: { outlet_id: outletId },
        select: { access_point_group_id: true },
      });
      const existingGroupIds = new Set(
        existingGroups.map((group) => group.access_point_group_id)
      );
      if (roomIds.some((id) => !existingGroupIds.has(id))) {
        throw new Error("Uma área espacial não pertence a este outlet.");
      }

      const selectedPoints = pointIds.length
        ? await transaction.accessPoints.findMany({
            where: { access_point_id: { in: pointIds } },
            select: { access_point_id: true, outlet_id: true },
          })
        : [];
      if (selectedPoints.length !== pointIds.length) {
        throw new Error("Um ou mais pontos de acesso não foram encontrados.");
      }
      if (
        selectedPoints.some(
          (point) => point.outlet_id != null && point.outlet_id !== outletId
        )
      ) {
        throw new Error("Um ou mais pontos de acesso pertencem a outro outlet.");
      }

      const retainedPointIds = new Set(pointIds);
      const currentPoints = await transaction.accessPoints.findMany({
        where: { outlet_id: outletId },
        select: { access_point_id: true },
      });
      const removedPointIds = currentPoints
        .map((point) => point.access_point_id)
        .filter((pointId) => !retainedPointIds.has(pointId));

      if (removedPointIds.length) {
        await transaction.accessPoints.updateMany({
          where: { access_point_id: { in: removedPointIds } },
          data: { outlet_id: null, access_point_group_id: null },
        });
      }

      const saved = [];
      for (const room of rooms) {
        const group =
          room.id === null
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

        if (room.points.length) {
          await transaction.accessPoints.updateMany({
            where: { access_point_id: { in: room.points } },
            data: {
              outlet_id: outletId,
              access_point_group_id: group.access_point_group_id,
            },
          });
        }

        const savedPoints = await transaction.accessPoints.findMany({
          where: {
            outlet_id: outletId,
            access_point_group_id: group.access_point_group_id,
          },
          orderBy: { access_point_id: "asc" },
        });
        saved.push({ group, points: savedPoints });
      }

      const retainedGroupIds = new Set(saved.map(({ group }) => group.access_point_group_id));
      const removedGroupIds = [...existingGroupIds].filter(
        (groupId) => !retainedGroupIds.has(groupId)
      );
      if (removedGroupIds.length) {
        await transaction.accessPointGroups.deleteMany({
          where: { access_point_group_id: { in: removedGroupIds } },
        });
      }

      return saved;
    });

    const points = savedRooms.flatMap((room) =>
      room.points.map((point) => ({
        ...point,
        roomName: room.group.access_point_group_name || "Área",
      }))
    );
    return Response.json({ rooms: savedRooms, points });
  } catch (error) {
    console.error(error);
    const knownStatuses = {
      "Outlet não encontrado.": 404,
      "Uma área espacial não pertence a este outlet.": 400,
      "Um ou mais pontos de acesso não foram encontrados.": 404,
      "Um ou mais pontos de acesso pertencem a outro outlet.": 409,
    };

    return Response.json(
      { error: error.message || "Não foi possível guardar os pontos de acesso." },
      { status: knownStatuses[error.message] || 500 }
    );
  }
}
