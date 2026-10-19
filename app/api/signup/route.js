import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { decryptEmailPassword } from "../emailSettings/route";

const prisma = new PrismaClient();

function generateCode() {
    return crypto.randomInt(100000, 1000000).toString();
}

async function generateUniqueCode() {
    let code;

    while (true) {
        code = generateCode();

        const existing = await prisma.users_FO.findUnique({
            where: {
                access_code: code,
            },
        });

        if (!existing) {
            return code;
        }
    }
}

// GET all
export async function GET() {
    try {
        const data = await prisma.users_FO.findMany({
            orderBy: {
                id: "desc",
            },
        });

        return Response.json(data);
    } catch (error) {
        console.error(error);

        return Response.json(
            {
                error: "Erro ao obter os utilizadores.",
            },
            { status: 500 }
        );
    }
}

// CREATE / SEND CODE
export async function POST(req) {
    try {
        const body = await req.json();

        const email = body.email?.trim().toLowerCase();

        if (!email) {
            return Response.json(
                {
                    success: false,
                    message: "O email é obrigatório.",
                },
                { status: 400 }
            );
        }

        // Procurar utilizador pelo email
        let user = await prisma.users_FO.findUnique({
            where: {
                email: email,
            },
        });

        let code;

        // Se já existe, gerar novo código
        if (user) {
            code = await generateUniqueCode();

            const expiration = new Date(Date.now() + 10 * 60 * 1000);

            user = await prisma.users_FO.update({
                where: {
                    id: user.id,
                },
                data: {
                    access_code: code,
                    access_code_expiration: expiration,
                },
            });
        }

        // Se não existe, criar utilizador
        else {
            code = await generateUniqueCode();

            const expiration = new Date(Date.now() + 10 * 60 * 1000);

            user = await prisma.users_FO.create({
                data: {
                    email: email,
                    access_code: code,
                    access_code_expiration: expiration,
                },
            });
        }

        // Buscar configurações de email
        const emailSettings = await prisma.emailSettings.findFirst({
            orderBy: {
                id: "asc",
            },
        });

        if (!emailSettings) {
            return Response.json(
                {
                    success: false,
                    message: "As configurações de email não estão configuradas.",
                },
                { status: 500 }
            );
        }

        if (
            !emailSettings.reply_email ||
            !emailSettings.reply_password ||
            !emailSettings.sending_server ||
            !emailSettings.sending_port
        ) {
            return Response.json(
                {
                    success: false,
                    message: "As configurações de email estão incompletas.",
                },
                { status: 500 }
            );
        }

        // Criar ligação SMTP
        const decryptedPassword = decryptEmailPassword(emailSettings.reply_password);

        const transporter = nodemailer.createTransport({
            host: emailSettings.sending_server,
            port: Number(emailSettings.sending_port),
            secure: Number(emailSettings.sending_port) === 465,

            auth: {
                user: emailSettings.reply_email,
                pass: decryptedPassword,
            },
        });

        // Enviar email
        const projectUrl = process.env.PROJECT_URL;

await transporter.sendMail({
    from: emailSettings.reply_email,
    to: user.email,

    subject: "Access Code",

    text: `
Your access code is:

${user.access_code}

Use this code to sign in.

Sign in here:
${projectUrl}/homepage?opensigninmodalaccesscode
  `,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 30px;
      ">

        <h2>Welcome</h2>

        <p>
          Your access code is:
        </p>

        <div style="
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          text-align: center;
          padding: 20px;
          margin: 25px 0;
          background: #f3f4f6;
          border-radius: 12px;
        ">
          ${user.access_code}
        </div>

        <p>
          Use this code to sign in.
        </p>

        <p>
          <a
            href="${projectUrl}/homepage?opensigninmodalaccesscode"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #000;
              color: #fff;
              text-decoration: none;
              border-radius: 8px;
            "
          >
            Sign in
          </a>
        </p>

      </div>
    `,
});

        return Response.json({
            success: true,
            message: "Código enviado para o email.",
        });
    } catch (error) {
        console.error("USERS_FO ERROR:", error);

        return Response.json(
            {
                success: false,
                message: "Não foi possível enviar o código.",
            },
            { status: 500 }
        );
    }
}