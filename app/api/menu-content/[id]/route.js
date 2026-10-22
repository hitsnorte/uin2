import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const menuId = Number(searchParams.get("menu_id"));
    const submenuParam = searchParams.get("submenu_id");

    const submenuId =
      submenuParam === null || submenuParam === ""
        ? null
        : Number(submenuParam);

    if (!Number.isInteger(menuId) || menuId <= 0) {
      return Response.json(
        { error: "Menu inválido." },
        { status: 400 }
      );
    }

    if (
      submenuId !== null &&
      (!Number.isInteger(submenuId) || submenuId <= 0)
    ) {
      return Response.json(
        { error: "Submenu inválido." },
        { status: 400 }
      );
    }

    const data = await prisma.menuSubmenuContent.findFirst({
      where: {
        menu_id: menuId,
        submenu_id: submenuId,
      },
      orderBy: {
        content_id: "desc",
      },
    });

    return Response.json(data);
  } catch (error) {
    console.error("Erro ao carregar conteúdo:", error);

    return Response.json(
      { error: "Erro ao carregar conteúdo." },
      { status: 500 }
    );
  }
}