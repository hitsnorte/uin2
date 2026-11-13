import { prisma } from "@/lib/prisma";
import {
  getStaychatCampaignItems,
  staychatCampaignFields,
} from "@/lib/staychatCampaignItems";

const itemsWithActiveCampaigns = {
  OR: staychatCampaignFields.map((field) => ({ [field]: true })),
};

export async function GET() {
  try {
    const items = await getStaychatCampaignItems(itemsWithActiveCampaigns);
    return Response.json(items);
  } catch (error) {
    console.error("Erro ao carregar itens para limpeza massiva Staychat:", error);
    return Response.json(
      { error: "Não foi possível carregar os itens com campanhas ativas." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const itemIds = body?.outletItemIds;

    if (
      !Array.isArray(itemIds) ||
      itemIds.length === 0 ||
      itemIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      return Response.json(
        { error: "Indique os itens válidos que pretende limpar." },
        { status: 400 }
      );
    }

    const result = await prisma.outletItems.updateMany({
      where: {
        outlet_item_id: { in: [...new Set(itemIds)] },
        ...itemsWithActiveCampaigns,
      },
      data: Object.fromEntries(
        staychatCampaignFields.map((field) => [field, false])
      ),
    });

    return Response.json({ cleanedCount: result.count });
  } catch (error) {
    console.error("Erro ao limpar campanhas Staychat em massa:", error);
    return Response.json(
      { error: "Não foi possível limpar as campanhas nos itens." },
      { status: 500 }
    );
  }
}
