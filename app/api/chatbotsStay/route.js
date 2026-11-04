import { prisma } from "@/lib/prisma";

const providers = ["Hijiffy", "Staychat"];
const PROPERTY_ID = 1;

function parseBoolean(value) {
  return value === true || value === "true" || value === "on";
}

function parseText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const settings = await prisma.chatbotsStay.findUnique({
      where: { propertyID: PROPERTY_ID },
    });

    return Response.json(settings);
  } catch (error) {
    console.error("Erro ao obter configuração dos chatbots:", error);

    return Response.json(
      { error: "Não foi possível obter a configuração dos chatbots." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const provider = parseText(body?.provider);

    if (!providers.includes(provider)) {
      return Response.json(
        { error: "Indique um provider válido." },
        { status: 400 }
      );
    }

    const hijiffyToken =
      provider === "Hijiffy" ? parseText(body.hijiffyToken) : null;
    const hijiffyCampaign =
      provider === "Hijiffy" ? parseText(body.hijiffyCampaign) : null;
    const staychatToken =
      provider === "Staychat" ? parseText(body.staychatToken) : null;
    const staychatPhoneID =
      provider === "Staychat" ? parseText(body.staychatPhoneID) : null;
    const staychatWebhook =
      provider === "Staychat" ? parseText(body.staychatWebhook) || null : null;

    if (
      (provider === "Hijiffy" && (!hijiffyToken || !hijiffyCampaign)) ||
      (provider === "Staychat" && (!staychatToken || !staychatPhoneID))
    ) {
      return Response.json(
        {
          error:
            provider === "Hijiffy"
              ? "Indique o token e a campanha Hijiffy."
              : "Indique o token e o phone ID do Staychat.",
        },
        { status: 400 }
      );
    }

    if (staychatWebhook && staychatWebhook.length > 150) {
      return Response.json(
        { error: "O webhook do Staychat não pode exceder 150 caracteres." },
        { status: 400 }
      );
    }

    const data = {
      active: parseBoolean(body.active),
      provider,
      hijiffyToken,
      hijiffyCampaign,
      staychatToken,
      staychatPhoneID,
      staychatWebhook,
    };

    const settings = await prisma.chatbotsStay.upsert({
      where: { propertyID: PROPERTY_ID },
      update: data,
      create: { propertyID: PROPERTY_ID, ...data },
    });

    return Response.json(settings);
  } catch (error) {
    console.error("Erro ao guardar configuração dos chatbots:", error);

    return Response.json(
      { error: "Não foi possível guardar a configuração dos chatbots." },
      { status: 500 }
    );
  }
}
