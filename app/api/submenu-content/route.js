import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

function parseSubmenuId(value) {
  const submenuId = Number(value);
  return Number.isInteger(submenuId) && submenuId > 0 ? submenuId : null;
}

async function getSubmenu(submenuId) {
  return prisma.submenus.findUnique({
    where: { submenu_id: submenuId },
    select: {
      submenu_id: true,
      menu_id: true,
    },
  });
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const submenuId = parseSubmenuId(searchParams.get("submenu_id"));
    if (!submenuId) {
      return Response.json({ error: "Submenu inválido." }, { status: 400 });
    }

    const submenu = await getSubmenu(submenuId);
    if (!submenu) {
      return Response.json({ error: "Submenu não encontrado." }, { status: 404 });
    }

    const submenuContent = await prisma.menuSubmenuContent.findFirst({
      where: { submenu_id: submenuId },
      orderBy: { content_id: "desc" },
      select: { content: true },
    });

    return Response.json({ content: submenuContent?.content ?? null });
  } catch (error) {
    console.error("Erro ao carregar conteúdo do submenu:", error);
    return Response.json(
      { error: "Erro ao carregar conteúdo do submenu." },
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
    const submenuId = parseSubmenuId(body?.submenu_id);
    if (!submenuId) {
      return Response.json({ error: "Submenu inválido." }, { status: 400 });
    }

    const submenu = await getSubmenu(submenuId);
    if (!submenu) {
      return Response.json({ error: "Submenu não encontrado." }, { status: 404 });
    }

    const existingContent = await prisma.menuSubmenuContent.findFirst({
      where: { submenu_id: submenuId },
      orderBy: { content_id: "desc" },
      select: { content_id: true },
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
            menu_id: submenu.menu_id,
            submenu_id: submenuId,
            content,
            created_by: userId,
            updated_by: userId,
          },
        });

    return Response.json(savedContent);
  } catch (error) {
    console.error("Erro ao guardar conteúdo do submenu:", error);
    return Response.json(
      { error: "Erro ao guardar conteúdo do submenu." },
      { status: 500 }
    );
  }
}
