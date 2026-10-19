
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const secret = process.env.EMAIL_PASSWORD_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      "EMAIL_PASSWORD_ENCRYPTION_KEY não está configurada."
    );
  }

  return crypto
    .createHash("sha256")
    .update(secret)
    .digest();
}

function encryptPassword(password) {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Guardamos iv + authTag + conteúdo encriptado
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

function decryptPassword(encryptedPassword) {
  const key = getEncryptionKey();

  const [ivHex, authTagHex, encryptedHex] =
    encryptedPassword.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Password encriptada inválida.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export async function GET() {
  try {
    const settings = await prisma.emailSettings.findFirst({
      orderBy: { id: "asc" },
    });

    if (!settings) {
      return Response.json(null);
    }

    // Nunca enviar a password/hash/encriptação para o frontend
    return Response.json({
      id: settings.id,
      reply_email: settings.reply_email,
      sending_server: settings.sending_server,
      sending_port: settings.sending_port,
      has_password: Boolean(settings.reply_password),
    });
  } catch (error) {
    console.error("Erro ao obter configurações:", error);

    return Response.json(
      { error: "Não foi possível obter as configurações." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const replyEmail = String(body.reply_email || "").trim();
    const replyPassword = String(body.reply_password || "");
    const sendingServer = String(body.sending_server || "").trim();
    const sendingPort = Number(body.sending_port);

    if (
      !replyEmail ||
      !sendingServer ||
      !Number.isInteger(sendingPort) ||
      sendingPort < 1 ||
      sendingPort > 65535
    ) {
      return Response.json(
        {
          error:
            "Preencha corretamente todos os campos de configuração de email.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.emailSettings.findFirst({
      orderBy: { id: "asc" },
    });

    /*
     * Só alteramos a password se o utilizador
     * tiver introduzido uma nova password.
     */
    let passwordToSave = existing?.reply_password || null;

    if (replyPassword.trim() !== "") {
      passwordToSave = encryptPassword(replyPassword);
    }

    const data = {
      reply_email: replyEmail,
      sending_server: sendingServer,
      sending_port: sendingPort,
      reply_password: passwordToSave,
    };

    const settings = existing
      ? await prisma.emailSettings.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.emailSettings.create({
          data,
        });

    /*
     * Nunca devolver reply_password.
     */
    return Response.json({
      id: settings.id,
      reply_email: settings.reply_email,
      sending_server: settings.sending_server,
      sending_port: settings.sending_port,
      has_password: Boolean(settings.reply_password),
    });
  } catch (error) {
    console.error("Erro ao guardar configurações:", error);

    return Response.json(
      {
        error:
          error.message ||
          "Não foi possível guardar as configurações.",
      },
      { status: 500 }
    );
  }
}

/*
 * Exporta esta função para ser usada pelo código
 * que envia os emails.
 */
export function decryptEmailPassword(encryptedPassword) {
  return decryptPassword(encryptedPassword);
}