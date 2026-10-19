import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const body = await req.json();

  const existingUser = await prisma.users.findFirst({
    where: { username: body.username }
  });

  if (existingUser) {
    return Response.json(
      { error: "User already exists" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  const user = await prisma.users.create({
    data: {
      username: body.username,
      password: hashedPassword, 
      type: 0
    }
  });

  return Response.json({
    message: "User created",
    user: {
      id: user.user_id,
      username: user.username
    }
  });
}