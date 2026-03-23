import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const profiles = await prisma.profile.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ profiles });
}
