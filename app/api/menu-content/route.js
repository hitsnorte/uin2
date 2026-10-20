import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

function parseMenuId(value) {
  const menuId = Number(value);
  return Number.isInteger(menuId) && menuId > 0 ? menuId : null;
}

async function getMenuWithoutSubmenus(menuId) {
  return prisma.menus.findFirst({
    where: {
      menu_id: menuId,
      has_submenus: false,
    },
    select: {
      menu_id: true,
      visible: true,
      Outlets: {
        select: {
          visible: true,
        },
      },
    },
  });
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(req.url);
    const menuId = parseMenuId(searchParams.get("menu_id"));
    if (!menuId) {
      return Response.json({ error: "Menu inválido." }, { status: 400 });
    }

    const menu = await getMenuWithoutSubmenus(menuId);
    if (
      !menu ||
      (!session?.user && (!menu.visible || !menu.Outlets?.visible))
    ) {
      return Response.json(
        { error: "O menu não existe, não está visível ou permite submenus." },
        { status: 404 }
      );
    }

    const menuContent = await prisma.menuSubmenuContent.findFirst({
      where: {
        menu_id: menuId,
        submenu_id: null,
      },
      orderBy: {
        content_id: "desc",
      },
      select: {
        content: true,
      },
    });

    return Response.json({ content: menuContent?.content ?? null });
  } catch (error) {
    console.error("Erro ao carregar conteúdo do menu:", error);
    return Response.json(
      { error: "Erro ao carregar conteúdo do menu." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const menuId = parseMenuId(body?.menu_id);
    if (!menuId) {
      return Response.json({ error: "Menu inválido." }, { status: 400 });
    }

    const menu = await getMenuWithoutSubmenus(menuId);
    if (!menu) {
      return Response.json(
        { error: "O menu não existe ou permite submenus." },
        { status: 404 }
      );
    }

    const existingContent = await prisma.menuSubmenuContent.findFirst({
      where: {
        menu_id: menuId,
        submenu_id: null,
      },
      orderBy: {
        content_id: "desc",
      },
      select: {
        content_id: true,
      },
    });

    const content = body?.content ?? {
      editor: {
        type: "doc",
        content: [{ type: "paragraph" }],
      },
      selectedProducts: [],
    };

    const savedContent = existingContent
      ? await prisma.menuSubmenuContent.update({
          where: { content_id: existingContent.content_id },
          data: {
            content,
            updated_at: new Date(),
            updated_by: userId,
          },
        })
      : await prisma.menuSubmenuContent.create({
          data: {
            menu_id: menuId,
            submenu_id: null,
            content,
            created_by: userId,
            updated_by: userId,
          },
        });

    return Response.json(savedContent);
  } catch (error) {
    console.error("Erro ao guardar conteúdo do menu:", error);
    return Response.json(
      { error: "Erro ao guardar conteúdo do menu." },
      { status: 500 }
    );
  }
}
