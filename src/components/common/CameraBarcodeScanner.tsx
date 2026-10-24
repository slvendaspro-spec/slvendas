import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Flashlight,
  Volume2,
  VolumeX,
  Scan,
  AlertTriangle,
  CheckCircle2,
  Keyboard,
  Barcode,
} from 'lucide-react';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Leitor Óptico por Câmara',
  subtitle = 'Aponte a câmara do telemóvel ou tablet para o código de barras',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<any>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Tocar bip sonoro
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  };

  // Listar dispositivos de vídeo
  useEffect(() => {
    if (!isOpen) return;

    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameraList(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        // Prefer rear camera
        const backCam = videoDevices.find(
          (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('traseira') || d.label.toLowerCase().includes('environment')
        );
        setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
      }
    }).catch(() => {});
  }, [isOpen]);

  // Iniciar fluxo da câmara
  const startCamera = async () => {
    stopCamera();
    setErrorMsg(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('A câmara não é suportada neste navegador.');
      setHasPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setHasPermission(true);
      startBarcodeDetection();
    } catch (err: any) {
      console.warn('Erro ao aceder à câmara:', err);
      setHasPermission(false);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Permissão de acesso à câmara foi recusada. Ative as permissões nas definições do navegador.'
          : 'Não foi possível aceder à câmara do dispositivo.'
      );
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Alternar Lanterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.()?.torch) {
      try {
        await (track.applyConstraints as any)({
          advanced: [{ torch: !torchEnabled }],
        });
        setTorchEnabled(!torchEnabled);
      } catch (e) {
        console.warn('Erro ao alternar lanterna:', e);
      }
    }
  };

  // Detecção contínua de código de barras
  const startBarcodeDetection = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let detector: any = null;

    if (hasBarcodeDetector) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });
      } catch (e) {
        detector = null;
      }
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawVal = barcodes[0].rawValue;
            handleDetectedCode(rawVal);
          }
        } catch {}
      }
    }, 350);
  };

  const handleDetectedCode = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    playBeep();
    setLastScanned(clean);

    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    setTimeout(() => {
      onScan(clean);
      stopCamera();
      onClose();
    }, 450);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleDetectedCode(manualCode.trim());
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setLastScanned(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, selectedCameraId, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0e1726] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0a101d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title={soundEnabled ? 'Silenciar Bip' : 'Ativar Bip'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Fechar Leitor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Frame Container */}
        <div className="relative bg-black flex-1 min-h-[300px] sm:min-h-[360px] flex items-center justify-center overflow-hidden">
          {hasPermission !== false ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover min-h-[300px]"
            />
          ) : (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm">Câmara Indisponível</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {errorMsg || 'Não foi possível aceder à câmara do dispositivo. Digite o código manualmente abaixo.'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>
            </div>
          )}

          {/* Canvas oculto para leitura gráfica */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlays / Guia Visual de Mira */}
          {hasPermission && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Moldura de corte */}
              <div className="relative w-64 sm:w-72 h-44 sm:h-48 border-2 border-cyan-400/80 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-black/15 flex items-center justify-center overflow-hidden">
                {/* Linha laser vermelha animada */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-rose-500 via-rose-300 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-bounce" />

                {/* Cantos destacados */}
                <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
                <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
                <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
                <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-white" />

                <span className="text-[10px] font-mono text-cyan-200/80 tracking-widest uppercase bg-black/50 px-2 py-0.5 rounded-full">
                  Posicione o Código
                </span>
              </div>

              {lastScanned && (
                <div className="mt-3 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-mono font-black text-xs shadow-lg animate-pulse flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lido: {lastScanned}</span>
                </div>
              )}
            </div>
          )}

          {/* Floating Action Controls on Camera */}
          {hasPermission && (
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                {cameraList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
                      setFacingMode(nextFacing);
                      setSelectedCameraId('');
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Alternar Câmara Frontal / Traseira"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl transition-colors ${
                    torchEnabled ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Lanterna / Flash"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-cyan-600/90 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg backdrop-blur-md transition-all active:scale-95"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Digitar Código</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer / Entrada Manual de Código */}
        {(showManualInput || hasPermission === false) && (
          <div className="p-4 border-t border-slate-800 bg-[#0a101d] space-y-2 animate-fadeIn">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Introduza o código (ex: 600100200301 ou PRD-001)..."
                  className="w-full bg-[#121c2d] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Confirmar
              </button>
            </form>
            <p className="text-[10px] text-slate-500 text-center">
              Pode usar scanner USB físico, leitor laser Bluetooth ou digitação direta no teclado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
