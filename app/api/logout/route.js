import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const cookieStore = await cookies();

    const sessionToken =
      cookieStore.get("userFOSession")?.value;

    // Se não existe cookie, simplesmente termina sessão
    if (!sessionToken) {
      return Response.json({
        success: true,
      });
    }

    // Invalidar sessão na BD
    await prisma.users_FO.updateMany({
      where: {
        session_token: sessionToken,
      },
      data: {
        session_token: null,
        session_expires_at: null,
      },
    });

    // Apagar cookie
    cookieStore.delete("userFOSession");

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Não foi possível terminar a sessão.",
      },
      { status: 500 }
    );
  }
}