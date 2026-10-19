import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const templates = await prisma.emailTemplates.findMany({
      orderBy: { email_template_id: "asc" },
    });

    return Response.json(templates);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const template = await prisma.emailTemplates.create({
      data: {
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
      },
    });

    return Response.json(template, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
