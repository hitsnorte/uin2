import { prisma } from "@/lib/prisma";

const providers = ["Hijiffy", "Whatsapp"];

function parsePropertyId(value) {
  const propertyID = Number(value);

  return Number.isInteger(propertyID) && propertyID > 0
    ? propertyID
    : null;
}

function parseBoolean(value) {
  return value === true || value === "true" || value === "on";
}

function parseDelay(value) {
  const delay = Number(value);

  return Number.isInteger(delay) && delay >= 0 ? delay : 0;
}

function serializeSettings(settings) {
  return {
    ...settings,
    propertyID: settings.propertyID,
  };
}

export async function GET() {
  try {
    const settings = await prisma.chatbotsStay.findFirst({
      orderBy: { propertyID: "asc" },
    });

    return Response.json(settings ? serializeSettings(settings) : null);
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
    const propertyID = parsePropertyId(body.propertyID);
    const provider = String(body.provider || "").trim();

    if (!propertyID || !providers.includes(provider)) {
      return Response.json(
        { error: "Indique uma propertyID válida e um provider válido." },
        { status: 400 }
      );
    }

    const data = {
      active: parseBoolean(body.active),
      provider,
      hijiffyToken:
        provider === "Hijiffy" ? String(body.hijiffyToken || "").trim() : null,
      hijiffyCampaign:
        provider === "Hijiffy"
          ? String(body.hijiffyCampaign || "").trim()
          : null,
      whatsappToken:
        provider === "Whatsapp" ? String(body.whatsappToken || "").trim() : null,
      whatsappPhoneID:
        provider === "Whatsapp"
          ? String(body.whatsappPhoneID || "").trim()
          : null,
      preCheckinEnabled:
        provider === "Whatsapp" && parseBoolean(body.preCheckinEnabled),
      checkinEnabled:
        provider === "Whatsapp" && parseBoolean(body.checkinEnabled),
      checkinDelay:
        provider === "Whatsapp" ? parseDelay(body.checkinDelay) : 0,
      preCheckoutEnabled:
        provider === "Whatsapp" && parseBoolean(body.preCheckoutEnabled),
      preCheckoutDelay:
        provider === "Whatsapp" ? parseDelay(body.preCheckoutDelay) : 0,
      checkoutEnabled:
        provider === "Whatsapp" && parseBoolean(body.checkoutEnabled),
      checkoutDelay:
        provider === "Whatsapp" ? parseDelay(body.checkoutDelay) : 0,
    };

    const settings = await prisma.chatbotsStay.upsert({
      where: { propertyID },
      update: data,
      create: { propertyID, ...data },
    });

    return Response.json(serializeSettings(settings));
  } catch (error) {
    console.error("Erro ao guardar configuração dos chatbots:", error);

    return Response.json(
      { error: "Não foi possível guardar a configuração dos chatbots." },
      { status: 500 }
    );
  }
}
