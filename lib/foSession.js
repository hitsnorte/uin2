import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getFoSessionUser(database = prisma) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("userFOSession")?.value;

  if (!sessionToken) return null;

  return database.users_FO.findFirst({
    where: {
      session_token: sessionToken,
      session_expires_at: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
    },
  });
}
