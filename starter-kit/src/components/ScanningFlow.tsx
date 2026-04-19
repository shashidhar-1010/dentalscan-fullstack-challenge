"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  MessageSquareMore,
  RefreshCw,
  Send,
  SwitchCamera,
} from "lucide-react";

const VIEWS = [
  { label: "Front View", instruction: "Smile and look straight at the camera." },
  { label: "Left View", instruction: "Turn your head to the left and keep your teeth inside the guide." },
  { label: "Right View", instruction: "Turn your head to the right and keep your teeth inside the guide." },
  { label: "Upper Teeth", instruction: "Tilt your head back, open wide, and hold steady." },
  { label: "Lower Teeth", instruction: "Tilt your head down, open wide, and hold steady." },
] as const;

type CameraFacingMode = "user" | "environment";
type QualityState = "poor" | "fair" | "good";
type CaptureStatus = "idle" | "capturing" | "submitting" | "complete";

type MessageItem = {
  id: string;
  content: string;
  sender: "patient" | "dentist";
  createdAt: string;
  optimistic?: boolean;
};

function useCameraStability() {
  const [quality, setQuality] = useState<QualityState>("fair");

  useEffect(() => {
    let fallbackIntervalId: number | undefined;
    let cooldownTimeoutId: number | undefined;
    let samples: number[] = [];

    const setWithCooldown = (nextQuality: QualityState) => {
      setQuality(nextQuality);

      if (cooldownTimeoutId) {
        window.clearTimeout(cooldownTimeoutId);
      }

      cooldownTimeoutId = window.setTimeout(() => {
        setQuality("fair");
      }, 1200);
    };

    const hasOrientationSupport =
      typeof window !== "undefined" && "DeviceOrientationEvent" in window;

    if (hasOrientationSupport) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        const beta = Math.abs(event.beta ?? 0);
        const gamma = Math.abs(event.gamma ?? 0);
        const movement = beta + gamma;

        samples = [...samples.slice(-4), movement];
        const averageMovement =
          samples.reduce((sum, value) => sum + value, 0) / samples.length;

        if (averageMovement > 70) {
          setWithCooldown("poor");
          return;
        }

        if (averageMovement > 35) {
          setWithCooldown("fair");
          return;
        }

        setWithCooldown("good");
      };

      window.addEventListener("deviceorientation", handleOrientation);

      return () => {
        window.removeEventListener("deviceorientation", handleOrientation);
        if (cooldownTimeoutId) {
          window.clearTimeout(cooldownTimeoutId);
        }
      };
    }

    fallbackIntervalId = window.setInterval(() => {
      setQuality((current) => {
        if (current === "poor") return "fair";
        if (current === "fair") return "good";
        return "good";
      });
    }, 1800);

    return () => {
      if (fallbackIntervalId) {
        window.clearInterval(fallbackIntervalId);
      }
      if (cooldownTimeoutId) {
        window.clearTimeout(cooldownTimeoutId);
      }
    };
  }, []);

  return quality;
}

const GuidanceOverlay = memo(function GuidanceOverlay({
  quality,
  currentStep,
  helperText,
}: {
  quality: QualityState;
  currentStep: number;
  helperText: string;
}) {
  const palette = {
    poor: "border-rose-500 bg-rose-500/10 text-rose-200",
    fair: "border-amber-400 bg-amber-400/10 text-amber-100",
    good: "border-emerald-400 bg-emerald-400/10 text-emerald-100",
  }[quality];

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
      <div className="relative flex h-[72%] w-[82%] max-w-[360px] items-center justify-center">
        <div
          className={`absolute inset-[8%] rounded-full border-[3px] transition-colors duration-300 ${palette}`}
        />
        <div className="absolute inset-[18%] rounded-full border border-white/15" />
        <div className="absolute left-1/2 top-1/2 h-[32%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[45%] border border-dashed border-white/35" />
        <div className="absolute bottom-4 left-1/2 w-[88%] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-zinc-300">
            <span>{VIEWS[currentStep].label}</span>
            <span className="font-semibold text-white">{quality}</span>
          </div>
          <p className="text-sm font-medium text-white">{helperText}</p>
        </div>
      </div>
    </div>
  );
});

function ResultSidebar({
  messages,
  draft,
  isSendingMessage,
  messageError,
  onDraftChange,
  onSend,
}: {
  messages: MessageItem[];
  draft: string;
  isSendingMessage: boolean;
  messageError: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <aside className="w-full border-l border-white/10 bg-zinc-950/80 backdrop-blur xl:max-w-md">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="rounded-xl bg-blue-500/15 p-2 text-blue-300">
          <MessageSquareMore size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Quick Message</h3>
          <p className="text-sm text-zinc-400">Send a question directly to the clinic.</p>
        </div>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
            No messages yet. Start the conversation with a quick question about your scan.
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                message.sender === "patient"
                  ? "ml-auto bg-blue-500 text-white"
                  : "bg-zinc-800 text-zinc-100"
              } ${message.optimistic ? "opacity-70" : "opacity-100"}`}
            >
              <p>{message.content}</p>
              <p className="mt-2 text-[11px] text-white/70">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-zinc-300">
          Message to clinic
        </label>
        <textarea
          id="message"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ask about next steps, timing, or scan quality."
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-blue-500"
          maxLength={1000}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{draft.trim().length}/1000</span>
          {messageError ? <span className="text-rose-400">{messageError}</span> : null}
        </div>
        <button
          onClick={onSend}
          disabled={isSendingMessage || !draft.trim()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSendingMessage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send message
        </button>
      </div>
    </aside>
  );
}

export default function ScanningFlow() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camReady, setCamReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraFacingMode>("user");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>("idle");
  const [notificationState, setNotificationState] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");
  const [draft, setDraft] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const quality = useCameraStability();
  const scanId = useMemo(() => `scan-${Date.now()}`, []);
  const currentStep = Math.min(capturedImages.length, VIEWS.length);
  const isScanComplete = capturedImages.length >= VIEWS.length;
  const activeStepIndex = Math.min(currentStep, VIEWS.length - 1);

  const helperText = useMemo(() => {
    if (quality === "poor") {
      return "Hold steady and keep your mouth inside the inner guide.";
    }

    if (quality === "fair") {
      return "Almost there. Center your teeth and reduce movement.";
    }

    if (activeStepIndex === 0) {
      return "Great start. Keep your full smile inside the circle.";
    }

    if (activeStepIndex === 3) {
      return "Tilt upward and keep your upper teeth inside the guide.";
    }

    if (activeStepIndex === 4) {
      return "Tilt downward and keep your lower teeth inside the guide.";
    }

    return "Looks good. Capture when the guide turns green.";
  }, [activeStepIndex, quality]);

  const startCamera = useCallback(async (facingMode: CameraFacingMode) => {
    setCamReady(false);
    setCameraError(null);

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setCamReady(true);
    } catch (error) {
      console.error("Camera access denied", error);
      setCameraError("Unable to access the camera. Please allow camera permissions and try again.");
    }
  }, []);

  useEffect(() => {
    void startCamera(cameraMode);

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraMode, startCamera]);

  const submitNotification = useCallback(
    async (images: string[]) => {
      setNotificationState("sending");

      try {
        const response = await fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scanId,
            status: "completed",
            userId: "clinic-demo",
            images,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create notification");
        }

        setNotificationState("sent");
      } catch (error) {
        console.error(error);
        setNotificationState("failed");
      }
    },
    [scanId]
  );

  const handleCapture = useCallback(() => {
    const video = videoRef.current;

    if (!video || captureStatus !== "idle" || isScanComplete) {
      return;
    }

    setCaptureStatus("capturing");

    window.setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 960;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setCaptureStatus("idle");
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      setCapturedImages((prev) => {
        const nextImages = [...prev, dataUrl];

        if (nextImages.length >= VIEWS.length) {
          setCaptureStatus("submitting");

          void submitNotification(nextImages).finally(() => {
            setCaptureStatus("complete");
          });
        } else {
          setCaptureStatus("idle");
        }

        return nextImages;
      });
    }, 250);
  }, [captureStatus, isScanComplete, submitNotification]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setMessageError(null);

    const optimisticMessage: MessageItem = {
      id: `temp-${Date.now()}`,
      content: trimmed,
      sender: "patient",
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setDraft("");

    try {
      const response = await fetch("/api/messaging", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          patientId: "demo-patient",
          dentistId: "demo-clinic",
          sender: "patient",
          content: trimmed,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to send message");
      }

      setThreadId(payload.threadId);
      setMessages((prev) =>
        prev.map((message) => (message.id === optimisticMessage.id ? payload.message : message))
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      setDraft(trimmed);
      setMessageError(error instanceof Error ? error.message : "Unable to send message");
    } finally {
      setIsSendingMessage(false);
    }
  }, [draft, isSendingMessage, threadId]);

  if (isScanComplete) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/10 bg-zinc-950/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <h1 className="font-semibold text-blue-400">DentalScan AI</h1>
              <p className="mt-1 text-sm text-zinc-400">Results dashboard</p>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              {notificationState === "sending" && "Notifying clinic..."}
              {notificationState === "sent" && "Clinic notified"}
              {notificationState === "failed" && "Notification failed"}
              {notificationState === "idle" && "Preparing notification"}
            </div>
          </div>
        </div>

        <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl gap-0 xl:grid-cols-[1fr_380px]">
          <section className="border-b border-white/10 p-6 xl:border-b-0 xl:border-r">
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-emerald-500/20 p-3 text-emerald-300">
                  {captureStatus === "complete" ? (
                    <CheckCircle2 size={28} />
                  ) : (
                    <Loader2 size={28} className="animate-spin" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Scan complete</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                    Your five guided images were captured successfully. The clinic can now review
                    the scan and follow up through the quick-message panel.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VIEWS.map((view, index) => (
                <div
                  key={view.label}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950"
                >
                  <div className="aspect-[4/3] bg-zinc-900">
                    {capturedImages[index] ? (
                      <img
                        src={capturedImages[index]}
                        alt={view.label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                        Pending capture
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/10 px-4 py-3">
                    <p className="font-medium text-white">{view.label}</p>
                    <p className="mt-1 text-sm text-zinc-400">{view.instruction}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <ResultSidebar
            messages={messages}
            draft={draft}
            isSendingMessage={isSendingMessage}
            messageError={messageError}
            onDraftChange={setDraft}
            onSend={handleSendMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-black text-white">
      <div className="flex w-full items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-4 backdrop-blur">
        <div>
          <h1 className="font-bold text-blue-400">DentalScan AI</h1>
          <p className="mt-1 text-xs text-zinc-500">Capture flow</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-zinc-500">Step {activeStepIndex + 1}/5</span>
          <p className="mt-1 text-sm text-white">{VIEWS[activeStepIndex].label}</p>
        </div>
      </div>

      <div className="relative w-full max-w-md flex-1 overflow-hidden bg-zinc-950">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
        <GuidanceOverlay quality={quality} currentStep={activeStepIndex} helperText={helperText} />

        {!camReady && !cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-zinc-200 backdrop-blur">
              <Loader2 size={16} className="animate-spin" />
              Initializing camera
            </div>
          </div>
        ) : null}

        {cameraError ? (
          <div className="absolute inset-x-5 top-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {cameraError}
          </div>
        ) : null}

        {captureStatus === "capturing" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-zinc-200 backdrop-blur">
              <Loader2 size={16} className="animate-spin" />
              Processing capture...
            </div>
          </div>
        ) : null}

        <div className="absolute bottom-8 left-0 right-0 px-6 text-center">
          <p className="text-sm font-medium text-white">{VIEWS[activeStepIndex].instruction}</p>
          <p className="mt-2 text-xs text-zinc-300">
            {quality === "good"
              ? "Stable enough to capture."
              : "Wait for a steadier frame for best results."}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md px-6 py-6">
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
          <div>
            <p className="font-medium text-white">Camera mode</p>
            <p className="text-xs text-zinc-400">
              Switch cameras if side-angle framing is easier with the rear lens.
            </p>
          </div>
          <button
            onClick={() => setCameraMode((prev) => (prev === "user" ? "environment" : "user"))}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/5"
          >
            <SwitchCamera size={14} />
            {cameraMode === "user" ? "Front" : "Rear"}
          </button>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleCapture}
            disabled={!camReady || Boolean(cameraError) || captureStatus !== "idle"}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
              {captureStatus === "capturing" ? (
                <Loader2 className="animate-spin text-black" />
              ) : (
                <Camera className="text-black" />
              )}
            </div>
          </button>

          <button
            onClick={() => void startCamera(cameraMode)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
          >
            <RefreshCw size={16} />
            Retry camera
          </button>
        </div>
      </div>

      <div className="flex w-full gap-2 overflow-x-auto px-4 pb-6">
        {VIEWS.map((view, index) => (
          <div
            key={view.label}
            className={`h-24 w-20 shrink-0 overflow-hidden rounded-2xl border-2 ${
              index === activeStepIndex ? "border-blue-500 bg-blue-500/10" : "border-zinc-800"
            }`}
          >
            {capturedImages[index] ? (
              <img src={capturedImages[index]} alt={view.label} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-2 text-center text-[10px] text-zinc-600">
                <span className="mb-1 font-semibold text-zinc-500">{index + 1}</span>
                <span>{view.label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}