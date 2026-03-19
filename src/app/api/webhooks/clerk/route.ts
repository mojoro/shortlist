import { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    const id = evt.data.id as string;
    const eventType = evt.type;

    if (eventType === "user.created") {
      const email =
        evt.data.email_addresses?.find(
          (e) => e.id === evt.data.primary_email_address_id,
        )?.email_address ?? null;

      // Check if a user with this email exists from a previous Clerk instance
      // (e.g., dev → prod migration). If so, remap their account to the new ID
      // so all their profiles, jobs, and applications transfer automatically.
      if (email) {
        const existing = await prisma.user.findFirst({
          where: { email, id: { not: id } },
        });
        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { id, email },
          });
          return new Response("OK", { status: 200 });
        }
      }

      await prisma.user.upsert({
        where: { id },
        create: { id, email },
        update: { email },
      });
    }

    if (eventType === "user.updated") {
      const email =
        evt.data.email_addresses?.find(
          (e) => e.id === evt.data.primary_email_address_id,
        )?.email_address ?? null;

      await prisma.user.upsert({
        where: { id },
        create: { id, email },
        update: { email },
      });
    }

    if (eventType === "user.deleted") {
      // Cascade delete handles profiles, jobs, applications, etc.
      // The DeleteAccountSection handles usage archival for self-deletion.
      // Webhook-triggered deletion (e.g., admin action in Clerk) just cleans up.
      await prisma.user.delete({ where: { id } }).catch(() => {
        // User may not exist in our DB — ignore
      });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[webhook/clerk] Verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }
}
