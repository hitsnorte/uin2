import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeProductContent(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeProductContent);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (value.type === "product") {
    return {
      ...value,
      attrs: {
        productId: value.attrs?.productId ?? null,
      },
    };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (key === "selectedProducts" && Array.isArray(entry)) {
        return [
          key,
          entry
            .map((item) =>
              item && typeof item === "object"
                ? item.productId ?? item.product_id ?? item.id
                : item
            )
            .filter((id) => id != null),
        ];
      }

      return [key, normalizeProductContent(entry)];
    })
  );
}

// GET
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("subcategory_id"));

    if (!id) {
      return Response.json({ error: "Missing subcategory_id" }, { status: 400 });
    }

    const data = await prisma.infoSubcategory.findFirst({
      where: { subcategory_id: id },
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// CREATE / UPDATE
export async function POST(req) {
  try {
    const body = await req.json();

    const existing = await prisma.infoSubcategory.findFirst({
      where: { subcategory_id: body.subcategory_id },
    });

    if (existing) {
      const updated = await prisma.infoSubcategory.update({
        where: {
          info_subcategory_id: existing.info_subcategory_id,
        },
        data: {
          content: normalizeProductContent(body.content),
          updated_at: new Date(),
        },
      });

      return Response.json(updated);
    }

    const created = await prisma.infoSubcategory.create({
      data: {
        subcategory_id: body.subcategory_id,
        content: normalizeProductContent(body.content),
      },
    });

    return Response.json(created);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}