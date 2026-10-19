import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();

    const sessionToken =
      cookieStore.get("userFOSession")?.value;

    // Não existe cookie
    if (!sessionToken) {
      return Response.json({
        authenticated: false,
      });
    }

    // Procurar sessão válida
    const user = await prisma.users_FO.findFirst({
      where: {
        session_token: sessionToken,
        session_expires_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Sessão inválida ou expirada
    if (!user) {
      return Response.json({
        authenticated: false,
      });
    }

    // Sessão válida
    return Response.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("SESSION ERROR:", error);

    return Response.json(
      {
        authenticated: false,
        message: "Não foi possível verificar a sessão.",
      },
      { status: 500 }
    );
  }
}
