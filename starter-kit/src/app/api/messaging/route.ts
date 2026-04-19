import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface MessageRequestBody {
  threadId?: string;
  patientId?: string;
  dentistId?: string;
  content?: string;
  sender?: "patient" | "dentist";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId")?.trim();

  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
  }

  try {
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({
      threadId: thread.id,
      patientId: thread.patientId,
      dentistId: thread.dentistId,
      messages: thread.messages,
    });
  } catch (err) {
    console.error("Messaging GET Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MessageRequestBody;
    const threadId = body.threadId?.trim();
    const patientId = body.patientId?.trim() || "demo-patient";
    const dentistId = body.dentistId?.trim() || "demo-clinic";
    const sender = body.sender;
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    if (!sender || !["patient", "dentist"].includes(sender)) {
      return NextResponse.json({ error: "sender must be either patient or dentist" }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: "Message must be 1000 characters or fewer" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const thread = threadId
        ? await tx.thread.findUnique({ where: { id: threadId } })
        : await tx.thread.create({
            data: {
              patientId,
              dentistId,
            },
          });

      if (!thread) {
        throw new Error("Thread not found");
      }

      const message = await tx.message.create({
        data: {
          threadId: thread.id,
          sender,
          content,
        },
      });

      await tx.thread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      });

      return { thread, message };
    });

    return NextResponse.json(
      {
        ok: true,
        threadId: result.thread.id,
        message: result.message,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Messaging API Error:", err);

    if (err instanceof Error && err.message === "Thread not found") {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}