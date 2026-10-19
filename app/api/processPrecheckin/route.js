import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import crypto from "crypto";

const prisma = new PrismaClient();

// --------------------------------------------------
// Configuração de desencriptação
// --------------------------------------------------

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

function decryptEmailPassword(encryptedPassword) {
  const key = getEncryptionKey();

  const [ivHex, authTagHex, encryptedHex] =
    encryptedPassword.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error(
      "Password SMTP encriptada inválida."
    );
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

// --------------------------------------------------
// Gerar código aleatório de 6 dígitos
// --------------------------------------------------

function generateAccessCode() {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
}

// --------------------------------------------------
// Gerar código único e guardar em Users_FO
// --------------------------------------------------

async function generateUniqueAccessCode() {
  while (true) {
    const accessCode = generateAccessCode();

    const exists = await prisma.Users_FO.findFirst({
      where: {
        access_code: accessCode,
      },
    });

    if (!exists) {
      await prisma.Users_FO.create({
        data: {
          access_code: accessCode,
        },
      });

      return accessCode;
    }
  }
}

// --------------------------------------------------
// GET - Processar pre-checkins automaticamente
// --------------------------------------------------

export async function GET() {
  try {
    console.log(
      "=== INÍCIO PROCESSAMENTO PRE-CHECKIN ==="
    );

    const stays =
      await prisma.myStayDetails.findMany({
        where: {
          control: "N",
          OR: [
            {
              preCheckinControl: "S",
            },
            {
              checkinControl: "S",
            },
          ],
        },
      });

    console.log(
      `Encontrados ${stays.length} registos para processar.`
    );

    if (stays.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "Não existem pre-checkins para processar.",
        processed: 0,
        errors: 0,
        total: 0,
      });
    }

    let processed = 0;
    let errors = 0;

    const results = [];

    for (const stay of stays) {
      try {
        console.log(
          `A processar recordID ${stay.recordID} - reservation ${stay.protelReservationID}`
        );

        // --------------------------------------------------
        // Validar dados
        // --------------------------------------------------

        if (!stay.propertyTag) {
          throw new Error(
            "propertyTag não definido."
          );
        }

        if (
          !stay.protelGuestEmail &&
          !stay.protelGuestPhone
        ) {
          throw new Error(
            "O hóspede não tem email nem telefone."
          );
        }

        // --------------------------------------------------
        // Obter configuração SMTP
        // --------------------------------------------------

        const emailSettings =
          await prisma.EmailSettings.findFirst({
            select: {
              reply_email: true,
              reply_password: true,
              sending_server: true,
              sending_port: true,
            },
          });

        if (!emailSettings) {
          throw new Error(
            "Configuração de email não encontrada."
          );
        }

        if (
          !emailSettings.reply_email ||
          !emailSettings.reply_password ||
          !emailSettings.sending_server ||
          !emailSettings.sending_port
        ) {
          throw new Error(
            "Configuração SMTP incompleta."
          );
        }

        console.log(
          "Configuração SMTP encontrada:",
          {
            server:
              emailSettings.sending_server,
            port:
              emailSettings.sending_port,
            user:
              emailSettings.reply_email,
          }
        );

        // --------------------------------------------------
        // Desencriptar password SMTP
        // --------------------------------------------------

        const smtpPassword =
          decryptEmailPassword(
            emailSettings.reply_password
          );

        // --------------------------------------------------
        // Criar transporter SMTP
        // --------------------------------------------------

        const smtpPort = Number(
          emailSettings.sending_port
        );

        const transporter =
          nodemailer.createTransport({
            host:
              emailSettings.sending_server,

            port: smtpPort,

            secure: smtpPort === 465,

            auth: {
              user:
                emailSettings.reply_email,

              pass: smtpPassword,
            },
          });

        // --------------------------------------------------
        // Testar autenticação SMTP
        // --------------------------------------------------

        console.log(
          "A testar autenticação SMTP..."
        );

        await transporter.verify();

        console.log(
          "Autenticação SMTP OK."
        );

        // --------------------------------------------------
        // Gerar código UIN único
        // --------------------------------------------------

        const accessCode =
          await generateUniqueAccessCode();

        console.log(
          `Código UIN gerado para recordID ${stay.recordID}`
        );

        // --------------------------------------------------
        // Enviar EMAIL
        // --------------------------------------------------

        if (stay.protelGuestEmail) {
          const firstName =
            stay.protelGuestFirstName || "";

          const emailSubject =
            "Your UIN Code";

          const emailBody = `
            <html>
              <body>
                <p>Dear ${firstName},</p>

                <p>Your UIN code is:</p>

                <h2>${accessCode}</h2>

                <p>
                  Please keep this code safe as you
                  will need it during your stay.
                </p>

                <p>Thank you.</p>
              </body>
            </html>
          `;

          await transporter.sendMail({
            from:
              emailSettings.reply_email,

            to:
              stay.protelGuestEmail,

            subject:
              emailSubject,

            html:
              emailBody,
          });

          console.log(
            `Email enviado para ${stay.protelGuestEmail}`
          );
        }

        // --------------------------------------------------
        // Enviar WHATSAPP
        // --------------------------------------------------

        if (stay.protelGuestPhone) {
          const chatbot =
            await prisma.chatbotsStay.findFirst();

          if (!chatbot) {
            throw new Error(
              "Configuração de WhatsApp não encontrada."
            );
          }

          const whatsappUrl =
            `https://graph.facebook.com/v25.0/${chatbot.whatsappPhoneID}/messages`;

          const whatsappBody = {
            messaging_product: "whatsapp",

            to: stay.protelGuestPhone,

            type: "template",

            template: {
              name: "uin_link",

              language: {
                code: "en",
              },

              components: [
                {
                  type: "body",

                  parameters: [
                    {
                      type: "text",
                      text:
                        stay.protelGuestFirstName || "",
                    },

                    {
                      type: "text",
                      text: accessCode,
                    },
                  ],
                },
              ],
            },
          };

          const whatsappResponse =
            await fetch(whatsappUrl, {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${chatbot.whatsappToken}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                whatsappBody
              ),
            });

          if (!whatsappResponse.ok) {
            const errorText =
              await whatsappResponse.text();

            throw new Error(
              `Erro ao enviar WhatsApp: ${errorText}`
            );
          }

          console.log(
            `WhatsApp enviado para ${stay.protelGuestPhone}`
          );
        }

        // --------------------------------------------------
        // Marcar como processado
        // --------------------------------------------------

        await prisma.myStayDetails.update({
          where: {
            recordID:
              stay.recordID,
          },

          data: {
            control:
              "S",
          },
        });

        console.log(
          `recordID ${stay.recordID} processado com sucesso.`
        );

        processed++;

        results.push({
          recordID:
            stay.recordID,

          success:
            true,

          accessCode,
        });
      } catch (error) {
        errors++;

        console.error(
          `Erro ao processar recordID ${stay.recordID}:`,
          error
        );

        results.push({
          recordID:
            stay.recordID,

          success:
            false,

          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    console.log(
      "=== FIM PROCESSAMENTO PRE-CHECKIN ==="
    );

    return NextResponse.json({
      success:
        true,

      total:
        stays.length,

      processed,

      errors,

      results,
    });
  } catch (error) {
    console.error(
      "Erro geral no processPrecheckin:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status:
          500,
      }
    );
  }
}