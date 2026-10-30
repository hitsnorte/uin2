import { getFoSessionUser } from "@/lib/foSession";

export async function GET() {
  try {
    const user = await getFoSessionUser();
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
