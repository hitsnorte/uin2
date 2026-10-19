import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const SESSION_DURATION = 48 * 60 * 60; // 48 horas

export async function POST(req) {
  try {
    const body = await req.json();

    const email = body.email?.trim().toLowerCase();
    const code = body.code?.trim();
    const password = body.password;

    // =====================================================
    // FLUXO 1: LOGIN NORMAL COM EMAIL + PASSWORD
    // =====================================================

    if (email && password && !code) {
      const user = await prisma.users_FO.findUnique({
        where: {
          email: email,
        },
      });

      // Utilizador não existe
      if (!user) {
        return Response.json(
          {
            success: false,
            message: "Email ou password incorretos.",
          },
          { status: 401 }
        );
      }

      // =====================================================
      // VERIFICAR SE A CONTA EXPIROU
      // account_duration está em segundos
      // =====================================================

      const accountExpiration = new Date(
        new Date(user.created_at).getTime() +
          user.account_duration * 1000
      );

      if (new Date() >= accountExpiration) {
        return Response.json(
          {
            success: false,
            message: "Esta conta expirou e já não pode iniciar sessão.",
          },
          { status: 401 }
        );
      }

      // =====================================================
      // CONTA AINDA NÃO TEM PASSWORD
      // =====================================================

      if (!user.password) {
        return Response.json(
          {
            success: false,
            message:
              "Esta conta ainda não tem uma password. Utilize primeiro o código de acesso.",
          },
          { status: 400 }
        );
      }

      // =====================================================
      // VERIFICAR PASSWORD
      // =====================================================

      const passwordValid = await bcrypt.compare(
        password,
        user.password
      );

      if (!passwordValid) {
        return Response.json(
          {
            success: false,
            message: "Email ou password incorretos.",
          },
          { status: 401 }
        );
      }

      // =====================================================
      // PASSWORD CORRETA -> CRIAR SESSÃO
      // =====================================================

      const sessionToken = crypto
        .randomBytes(32)
        .toString("hex");

      const sessionExpiresAt = new Date(
        Date.now() + SESSION_DURATION * 1000
      );

      await prisma.users_FO.update({
        where: {
          id: user.id,
        },
        data: {
          session_token: sessionToken,
          session_expires_at: sessionExpiresAt,
        },
      });

      // =====================================================
      // CRIAR RESPOSTA
      // =====================================================

      const response = Response.json({
        success: true,
        step: "complete",
        message: "Sessão iniciada com sucesso.",
        user: {
          id: user.id,
          email: user.email,
        },
      });

      // =====================================================
      // CRIAR COOKIE userFOSession
      // =====================================================

      response.headers.set(
        "Set-Cookie",
        [
          `userFOSession=${sessionToken}`,
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          `Max-Age=${SESSION_DURATION}`,
          process.env.NODE_ENV === "production"
            ? "Secure"
            : "",
        ]
          .filter(Boolean)
          .join("; ")
      );

      return response;
    }

    // =====================================================
    // FLUXO 2: PRIMEIRO ACESSO COM CÓDIGO
    // =====================================================

    if (!code) {
      return Response.json(
        {
          success: false,
          message: "O código de acesso é obrigatório.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // PROCURAR UTILIZADOR PELO CÓDIGO
    // =====================================================

    const user = await prisma.users_FO.findUnique({
      where: {
        access_code: code,
      },
    });

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "Código de acesso inválido.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // CASO ESPECIAL: CÓDIGO EXISTE MAS REGISTO ESTÁ INCOMPLETO
    // (SEM EMAIL E/OU SEM access_code_expiration)
    // DEVEMOS PEDIR EMAIL + PASSWORD PARA FINALIZAR A CONTA
    // =====================================================

    if (!user.email || !user.access_code_expiration) {
      if (!email || !password) {
        return Response.json({
          success: true,
          step: "account_setup",
          message:
            "Este código está incompleto. Introduza o email e a password para concluir o registo.",
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        return Response.json(
          {
            success: false,
            message: "O email é obrigatório.",
          },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return Response.json(
          {
            success: false,
            message:
              "A password deve ter pelo menos 8 caracteres.",
          },
          { status: 400 }
        );
      }

      const existingUser = await prisma.users_FO.findUnique({
        where: {
          email: cleanEmail,
        },
      });

      if (existingUser && existingUser.id !== user.id) {
        return Response.json(
          {
            success: false,
            message: "Este email já está associado a outra conta.",
          },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const sessionToken = crypto
        .randomBytes(32)
        .toString("hex");
      const sessionExpiresAt = new Date(
        Date.now() + SESSION_DURATION * 1000
      );

      const updatedUser = await prisma.users_FO.update({
        where: {
          id: user.id,
        },
        data: {
          email: cleanEmail,
          password: hashedPassword,
          access_code: null,
          access_code_expiration: null,
          session_token: sessionToken,
          session_expires_at: sessionExpiresAt,
        },
      });

      const response = Response.json({
        success: true,
        step: "complete",
        message: "Conta concluída com sucesso.",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
        },
      });

      response.headers.set(
        "Set-Cookie",
        [
          `userFOSession=${sessionToken}`,
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          `Max-Age=${SESSION_DURATION}`,
          process.env.NODE_ENV === "production"
            ? "Secure"
            : "",
        ]
          .filter(Boolean)
          .join("; ")
      );

      return response;
    }

    // =====================================================
    // VERIFICAR SE A CONTA EXPIROU
    // =====================================================

    const accountExpiration = new Date(
      new Date(user.created_at).getTime() +
        user.account_duration * 1000
    );

    if (new Date() >= accountExpiration) {
      return Response.json(
        {
          success: false,
          message: "Esta conta expirou e já não pode ser utilizada.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // VERIFICAR SE O CÓDIGO EXPIROU
    // =====================================================

    if (
      !user.access_code_expiration ||
      new Date() >= new Date(user.access_code_expiration)
    ) {
      return Response.json(
        {
          success: false,
          message:
            "O código de acesso expirou. Solicite um novo código.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // GARANTIR QUE É PRIMEIRO ACESSO
    // =====================================================

    if (user.password) {
      return Response.json(
        {
          success: false,
          message:
            "Esta conta já tem uma password. Inicie sessão com email e password.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // CÓDIGO VÁLIDO -> PEDIR PASSWORD
    // =====================================================

    if (!password) {
      return Response.json({
        success: true,
        step: "password",
        message: "Código válido.",
      });
    }

    // =====================================================
    // VALIDAR PASSWORD
    // =====================================================

    if (password.length < 8) {
      return Response.json(
        {
          success: false,
          message:
            "A password deve ter pelo menos 8 caracteres.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // CRIAR HASH DA PASSWORD
    // =====================================================

    const hashedPassword = await bcrypt.hash(password, 12);

    // =====================================================
    // CRIAR SESSÃO
    // =====================================================

    const sessionToken = crypto
      .randomBytes(32)
      .toString("hex");

    const sessionExpiresAt = new Date(
      Date.now() + SESSION_DURATION * 1000
    );

    // =====================================================
    // GUARDAR PASSWORD + SESSÃO
    // INVALIDAR CÓDIGO
    // =====================================================

    const updatedUser = await prisma.users_FO.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,

        // O código só serve para o primeiro acesso
        access_code: null,
        access_code_expiration: null,

        // Criar sessão
        session_token: sessionToken,
        session_expires_at: sessionExpiresAt,
      },
    });

    // =====================================================
    // CRIAR RESPOSTA
    // =====================================================

    const response = Response.json({
      success: true,
      step: "complete",
      message: "Password definida com sucesso.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
      },
    });

    // =====================================================
    // CRIAR COOKIE userFOSession
    // =====================================================

    response.headers.set(
      "Set-Cookie",
      [
        `userFOSession=${sessionToken}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${SESSION_DURATION}`,
        process.env.NODE_ENV === "production"
          ? "Secure"
          : "",
      ]
        .filter(Boolean)
        .join("; ")
    );

    return response;
  } catch (error) {
    console.error("SIGNIN ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Não foi possível iniciar sessão.",
      },
      { status: 500 }
    );
  }
}