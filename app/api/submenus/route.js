import { prisma } from "@/lib/prisma";

export async function GET() {
  const submenus = await prisma.submenus.findMany();
  return Response.json(submenus);
}

export async function POST(req) {
  const body = await req.json();

  const created = await prisma.submenus.create({
    data: {
      menu_id: body.menu_id ? Number(body.menu_id) : null,
      submenu_name1: body.submenu_name1 || null,
      submenu_name2: body.submenu_name2 || null,
      submenu_name3: body.submenu_name3 || null,
      submenu_name4: body.submenu_name4 || null,
      submenu_name5: body.submenu_name5 || null,
      visible: true,
      submenu_card_background: body.submenu_card_background || null,
    },
  });

  return Response.json(created);
}
