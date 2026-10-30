import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFoSessionUser } from "@/lib/foSession";
import TableReservationClient from "./client";

export default async function TableReservationPage({ searchParams }) {
  const { outlet_id: requestedOutletId } = await searchParams;
  const outletId = Number(requestedOutletId);

  if (Number.isSafeInteger(outletId) && outletId > 0) {
    const checkinItem = await prisma.outletItems.findFirst({
      where: {
        outlet_id: outletId,
        is_reservation_item: true,
        checkin: "1",
      },
      select: { outlet_item_id: true },
    });

    if (checkinItem && !(await getFoSessionUser())) {
      redirect(
        `/homepage?opensigninmodal&reservation_outlet_id=${outletId}`
      );
    }
  }

  return <TableReservationClient />;
}
