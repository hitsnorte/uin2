import { prisma } from "@/lib/prisma";

export const staychatCampaignFields = [
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

function getName(record, prefix) {
  return (
    record?.[`${prefix}_name1`] ||
    record?.[`${prefix}_name2`] ||
    record?.[`${prefix}_name3`] ||
    record?.[`${prefix}_name4`] ||
    record?.[`${prefix}_name5`] ||
    null
  );
}

function getProductIds(content) {
  const ids = new Set();

  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;

    if (value.type === "product" && value.attrs?.productId != null) {
      const id = Number(value.attrs.productId);
      if (Number.isSafeInteger(id) && id > 0) ids.add(id);
    }

    if (Array.isArray(value.selectedProducts)) {
      for (const product of value.selectedProducts) {
        const rawId =
          product && typeof product === "object"
            ? product.productId ?? product.product_id ?? product.id
            : product;
        const id = Number(rawId);
        if (Number.isSafeInteger(id) && id > 0) ids.add(id);
      }
    }

    Object.values(value).forEach(visit);
  }

  visit(content);
  return ids;
}

export async function getStaychatCampaignItems(where) {
  const items = await prisma.outletItems.findMany({
    where,
    select: {
      outlet_item_id: true,
      item_name1: true,
      item_type: true,
      outlet_id: true,
      ...Object.fromEntries(staychatCampaignFields.map((field) => [field, true])),
    },
    orderBy: [{ outlet_id: "asc" }, { item_name1: "asc" }],
  });

  if (items.length === 0) return [];

  const outletIds = [...new Set(items.map((item) => item.outlet_id))];
  const [outlets, menus, submenus, contents] = await Promise.all([
    prisma.outlets.findMany({
      where: { outlet_id: { in: outletIds } },
      select: {
        outlet_id: true,
        outlet_name1: true,
        outlet_name2: true,
        outlet_name3: true,
        outlet_name4: true,
        outlet_name5: true,
      },
    }),
    prisma.menus.findMany({
      select: {
        menu_id: true,
        outlet_id: true,
        menu_name1: true,
        menu_name2: true,
        menu_name3: true,
        menu_name4: true,
        menu_name5: true,
      },
    }),
    prisma.submenus.findMany({
      select: {
        submenu_id: true,
        menu_id: true,
        submenu_name1: true,
        submenu_name2: true,
        submenu_name3: true,
        submenu_name4: true,
        submenu_name5: true,
      },
    }),
    prisma.menuSubmenuContent.findMany({
      select: { menu_id: true, submenu_id: true, content: true },
    }),
  ]);

  const outletsById = new Map(outlets.map((outlet) => [outlet.outlet_id, outlet]));
  const menusById = new Map(menus.map((menu) => [menu.menu_id, menu]));
  const submenusById = new Map(
    submenus.map((submenu) => [submenu.submenu_id, submenu])
  );
  const locationsByItemId = new Map();

  for (const content of contents) {
    const submenu = content.submenu_id
      ? submenusById.get(content.submenu_id)
      : null;
    const menu = menusById.get(submenu?.menu_id ?? content.menu_id);
    if (!menu) continue;

    const location = {
      menu: getName(menu, "menu"),
      submenu: submenu ? getName(submenu, "submenu") : null,
    };

    for (const itemId of getProductIds(content.content)) {
      const locations = locationsByItemId.get(itemId) || [];
      if (
        !locations.some(
          (existing) =>
            existing.menu === location.menu &&
            existing.submenu === location.submenu
        )
      ) {
        locations.push(location);
        locationsByItemId.set(itemId, locations);
      }
    }
  }

  return items.map((item) => ({
    outlet_item_id: item.outlet_item_id,
    outlet_id: item.outlet_id,
    item_name: item.item_name1,
    item_type: item.item_type,
    outlet_name: getName(outletsById.get(item.outlet_id), "outlet"),
    locations: locationsByItemId.get(item.outlet_item_id) || [],
    campaigns: Object.fromEntries(
      staychatCampaignFields.map((field) => [field, item[field] === true])
    ),
    activeCampaigns: staychatCampaignFields.filter((field) => item[field] === true),
  }));
}
