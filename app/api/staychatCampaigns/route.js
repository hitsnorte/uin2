import { prisma } from "@/lib/prisma";

const campaignFields = [
  "product_accept",
  "product_in_progress",
  "product_completed",
  "product_cancelled",
  "service_confirmed",
  "service_modified",
  "service_cancelled",
  "reservation_confirmed",
  "reservation_cancelled",
];

function parseCampaign(value) {
  return typeof value === "string" ? value.trim() || null : null;
}

export async function GET() {
  try {
    const campaigns = await prisma.staychatCampaigns.findFirst({
      orderBy: { staychat_campaign_id: "asc" },
    });

    return Response.json(campaigns);
  } catch (error) {
    console.error("Erro ao obter campanhas Staychat:", error);

    return Response.json(
      { error: "Não foi possível obter as campanhas Staychat." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = Object.fromEntries(
      campaignFields.map((field) => [field, parseCampaign(body?.[field])])
    );
    const invalidField = campaignFields.find(
      (field) => data[field]?.length > 200
    );

    if (invalidField) {
      return Response.json(
        { error: "Cada campanha Staychat pode ter no máximo 200 caracteres." },
        { status: 400 }
      );
    }

    const existingCampaigns = await prisma.staychatCampaigns.findFirst({
      orderBy: { staychat_campaign_id: "asc" },
      select: { staychat_campaign_id: true },
    });

    const campaigns = existingCampaigns
      ? await prisma.staychatCampaigns.update({
          where: {
            staychat_campaign_id: existingCampaigns.staychat_campaign_id,
          },
          data,
        })
      : await prisma.staychatCampaigns.create({ data });

    return Response.json(campaigns);
  } catch (error) {
    console.error("Erro ao guardar campanhas Staychat:", error);

    return Response.json(
      { error: "Não foi possível guardar as campanhas Staychat." },
      { status: 500 }
    );
  }
}
