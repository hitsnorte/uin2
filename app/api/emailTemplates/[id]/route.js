import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getTemplateData(body) {
  return {
    email_title1: body.email_title1 || null,
    email_title2: body.email_title2 || null,
    email_title3: body.email_title3 || null,
    email_title4: body.email_title4 || null,
    email_title5: body.email_title5 || null,
    email_body1: body.email_body1 || null,
    email_body2: body.email_body2 || null,
    email_body3: body.email_body3 || null,
    email_body4: body.email_body4 || null,
    email_body5: body.email_body5 || null,
  };
}

export async function GET(_, context) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    const template = await prisma.emailTemplates.findUnique({
      where: { email_template_id: id },
    });

    if (!template) {
      return Response.json({ error: "Modelo não encontrado" }, { status: 404 });
    }

    return Response.json(template);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    const template = await prisma.emailTemplates.update({
      where: { email_template_id: id },
      data: getTemplateData(await request.json()),
    });

    return Response.json(template);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_, context) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    await prisma.emailTemplates.delete({ where: { email_template_id: id } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
