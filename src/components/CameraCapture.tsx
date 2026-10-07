import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  /** Texto de apoio exibido acima do visor. */
  hint?: string;
}

/**
 * Abre a câmera do aparelho (com pedido de permissão) e devolve a foto como File.
 * Se o navegador não permitir acesso à câmera, oferece o seletor nativo de foto.
 */
const CameraCapture = ({ open, onClose, onCapture, hint }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setReady(false);
    stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não permite abrir a câmera. Use “Escolher foto”.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
    } catch (e: unknown) {
      const name = (e as { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Permissão de câmera negada. Autorize a câmera nas configurações do navegador ou escolha uma foto da galeria.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("Nenhuma câmera encontrada neste aparelho. Escolha uma foto da galeria.");
      } else {
        setError("Não consegui abrir a câmera agora. Tente de novo ou escolha uma foto.");
      }
    }
  }, [facing, stop]);

  useEffect(() => {
    if (open) start();
    else stop();
    return stop;
  }, [open, start, stop]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
        stop();
        onClose();
      },
      "image/jpeg",
      0.9,
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col" role="dialog" aria-modal="true" aria-label="Câmera">
      <div className="safe-top-bar flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">{hint ?? "Enquadre e toque para fotografar"}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            aria-label="Alternar câmera"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          >
            <SwitchCamera className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Fechar câmera" onClick={() => { stop(); onClose(); }}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className="max-h-full max-w-full object-contain" />
        {!ready && !error && (
          <p className="absolute text-white/80 text-sm">Abrindo a câmera…</p>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-white/90 text-sm max-w-sm">{error}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="secondary" className="gap-2" onClick={start}>
                <RefreshCw className="w-4 h-4" /> Tentar de novo
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent text-white" onClick={() => fallbackRef.current?.click()}>
                Escolher foto
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4 flex justify-center">
        <button
          onClick={shoot}
          disabled={!ready}
          aria-label="Tirar foto"
          className="h-[72px] w-[72px] rounded-full border-4 border-white/80 bg-white/20 disabled:opacity-40 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Camera className="w-7 h-7 text-white" />
        </button>
      </div>

      <input
        ref={fallbackRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onCapture(f);
            onClose();
          }
        }}
      />
    </div>
  );
};

export default CameraCapture;
