import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface NotifyRequestBody {
  scanId?: string;
  status?: string;
  userId?: string;
  images?: string[];
}

async function simulateNotificationDispatch(notificationId: string) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 250));

    await prisma.notification.update({
      where: { id: notificationId },
      data: { deliveryStatus: "sent" },
    });
  } catch (error) {
    console.error("Notification dispatch error:", error);

    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { deliveryStatus: "failed" },
      });
    } catch (updateError) {
      console.error("Notification status update failed:", updateError);
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NotifyRequestBody;
    const scanId = body.scanId?.trim();
    const status = body.status?.trim();
    const userId = body.userId?.trim() || "clinic-demo";
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];

    if (!scanId) {
      return NextResponse.json({ error: "scanId is required" }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    if (status !== "completed") {
      await prisma.scan.upsert({
        where: { id: scanId },
        create: {
          id: scanId,
          status,
          images: images.join(","),
        },
        update: {
          status,
          images: images.length > 0 ? images.join(",") : undefined,
        },
      });

      return NextResponse.json({ ok: true, message: "Scan saved without notification" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scan.upsert({
        where: { id: scanId },
        create: {
          id: scanId,
          status: "completed",
          images: images.join(","),
        },
        update: {
          status: "completed",
          images: images.length > 0 ? images.join(",") : undefined,
        },
      });

      const notification = await tx.notification.create({
        data: {
          scanId: scan.id,
          userId,
          title: "Scan completed",
          message: `A new patient scan (${scan.id.slice(-6)}) is ready for review.`,
          read: false,
          deliveryStatus: "queued",
        },
      });

      return { scan, notification };
    });

    void simulateNotificationDispatch(result.notification.id);

    return NextResponse.json(
      {
        ok: true,
        scanId: result.scan.id,
        notificationId: result.notification.id,
        deliveryStatus: result.notification.deliveryStatus,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Notification API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}