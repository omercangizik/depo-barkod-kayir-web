import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Alert } from "../components/Alert";
import { apiClient, getErrorMessage } from "../services/api";

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
];

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return "Kamera izni engellendi. Tarayıcı adres çubuğundan kamera iznini açıp tekrar deneyin.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Kamera bulunamadı. Kamera bağlı/etkin mi kontrol edin veya barkodu elle girin.";
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return "Kamera başka bir uygulama tarafından kullanılıyor olabilir. Diğer uygulamaları kapatıp tekrar deneyin.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "Seçilen kamera açılamadı. Kamera listesinden başka bir kamera seçip tekrar deneyin.";
  }
  if (name === "NotSupportedError" || name === "TypeError") {
    return "Kamera için HTTPS veya localhost gerekir. Sayfayı güvenli bağlantıdan açın.";
  }
  return "Kamera başlatılamadı. Kamera iznini, HTTPS bağlantısını ve cihaz ayarlarını kontrol edin.";
}

export function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [manual, setManual] = useState("");
  const [matches, setMatches] = useState<{ barkodNo: string; urunAdi: string; anaKategori: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState("Kamera bağlanıyor...");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCode = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code || busyRef.current || code === lastCodeRef.current) return;
      busyRef.current = true;
      lastCodeRef.current = code;
      setError("");
      setStatus(`Barkod okundu: ${code}. Kayıt aranıyor...`);
      if (navigator.vibrate) navigator.vibrate(80);
      try {
        await apiClient.getByBarcode(code);
        navigate(`/products/${encodeURIComponent(code)}`);
      } catch (err) {
        const message = getErrorMessage(err);
        if (message.toLocaleLowerCase("tr-TR").includes("bulunamadı")) {
          navigate(`/products/new?barcode=${encodeURIComponent(code)}`);
        } else {
          setError(message);
          setStatus("Barkod okundu ancak ürün aranamadı. Bağlantıyı kontrol edip tekrar deneyin.");
          busyRef.current = false;
          lastCodeRef.current = "";
        }
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (!cameraOn) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setCameraReady(false);
      setStatus("Kamera kapalı. Manuel barkod girişi kullanılabilir.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Bu tarayıcı kamera erişimini desteklemiyor. HTTPS veya localhost üzerinden açın.");
      setStatus("Kamera kullanılamıyor.");
      setCameraOn(false);
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let controls: IScannerControls | null = null;
    setError("");
    setCameraReady(false);
    setStatus("Kamera izni bekleniyor...");
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 });
    const callback: Parameters<typeof reader.decodeFromVideoDevice>[2] = (result) => {
      if (cancelled || !result) return;
      void handleCode(result.getText());
    };

    const start = deviceId
      ? reader.decodeFromVideoDevice(deviceId, video, callback)
      : reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video,
          callback,
        );

    start
      .then(async (startedControls) => {
        if (cancelled) {
          startedControls.stop();
          return;
        }
        controls = startedControls;
        controlsRef.current = startedControls;
        setCameraReady(true);
        setStatus("Barkodu çerçevenin içine hizalayıp sabit tutun.");
        try {
          const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(
            (item) => item.kind === "videoinput",
          );
          if (!cancelled) {
            setDevices(cameras);
            const activeId = video.srcObject instanceof MediaStream
              ? video.srcObject.getVideoTracks()[0]?.getSettings().deviceId
              : undefined;
            if (!deviceId && activeId) setDeviceId(activeId);
          }
        } catch {
          // Kamera çalışıyor; bazı tarayıcılar cihaz listesini göstermeyi engelleyebilir.
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCameraReady(false);
        setError(cameraErrorMessage(err));
        setStatus("Kamera başlatılamadı. İzin verdikten sonra yeniden deneyin.");
      });

    return () => {
      cancelled = true;
      controls?.stop();
      if (controlsRef.current === controls) controlsRef.current = null;
    };
  }, [cameraOn, deviceId, handleCode]);

  async function searchManual() {
    setError("");
    setMatches([]);
    const query = manual.trim();
    if (!query) {
      setError("Barkod numarası veya ürün adı girin.");
      return;
    }
    setSearching(true);
    busyRef.current = true;
    setStatus("Ürün aranıyor...");
    try {
      const response = await apiClient.products({ search: query, page: 1, limit: 100 });
      const items = response.data.data.items;
      const normalizedQuery = query.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
      const exactBarcode = items.find((item) => item.barkodNo.trim() === query);
      const exactName = items.filter(
        (item) => item.urunAdi.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ") === normalizedQuery,
      );
      if (exactBarcode) {
        navigate(`/products/${encodeURIComponent(exactBarcode.barkodNo)}`);
        return;
      }
      if (exactName.length === 1) {
        navigate(`/products/${encodeURIComponent(exactName[0].barkodNo)}`);
        return;
      }
      const results = exactName.length > 1 ? exactName : items;
      if (results.length) {
        setMatches(results);
        setStatus(`${results.length} eşleşen ürün bulundu. Açmak için ürünü seçin.`);
        return;
      }
      if (/^\d+$/.test(query)) {
        navigate(`/products/new?barcode=${encodeURIComponent(query)}`);
        return;
      }
      setStatus("Bu adla eşleşen bir ürün bulunamadı.");
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("Ürün aranamadı.");
    } finally {
      busyRef.current = false;
      setSearching(false);
    }
  }

  function retryCamera() {
    setError("");
    setCameraOn(false);
    window.setTimeout(() => setCameraOn(true), 0);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-dark">Barkod Okut</h1>
      {error && (
        <Alert type="error">
          <div>{error}</div>
          {!cameraReady && (
            <button type="button" onClick={retryCamera} className="mt-2 underline underline-offset-2">
              Kamerayı yeniden dene
            </button>
          )}
        </Alert>
      )}
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black sm:aspect-video">
        <video
          ref={videoRef}
          className={`${cameraOn ? "block" : "hidden"} h-full w-full object-cover`}
          muted
          playsInline
          autoPlay
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
            {cameraOn ? "Kamera görüntüsü bekleniyor..." : "Kamera kapalı. Manuel barkod girişini kullanabilirsiniz."}
          </div>
        )}
        {cameraReady && <div className="pointer-events-none absolute inset-x-6 top-1/2 h-28 -translate-y-1/2 rounded-xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />}
      </div>
      <p className="text-sm text-slate-600" aria-live="polite">{status}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Kamera seç"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          disabled={!devices.length}
        >
          {devices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Kamera ${index + 1}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => (cameraOn ? setCameraOn(false) : retryCamera())}
          className="rounded-xl bg-slate-800 px-4 py-3 font-medium text-white"
        >
          {cameraOn ? "Kamerayı kapat" : "Kamerayı aç"}
        </button>
      </div>
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <label htmlFor="manual-barcode" className="text-sm font-medium">Barkod veya ürün adı</label>
        <input
          id="manual-barcode"
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && searchManual()}
          disabled={searching}
          className="w-full rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Barkod numarası ya da ürün adı yazın"
          inputMode="text"
          autoComplete="off"
        />
        <button type="button" onClick={searchManual} disabled={searching} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60">
          {searching ? "Aranıyor..." : "Ürünü Ara"}
        </button>
        {matches.length > 0 && (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200" aria-label="Arama sonuçları">
            {matches.map((product) => (
              <li key={product.barkodNo}>
                <button
                  type="button"
                  onClick={() => navigate(`/products/${encodeURIComponent(product.barkodNo)}`)}
                  className="w-full p-3 text-left hover:bg-slate-50"
                >
                  <span className="block font-medium">{product.urunAdi || "Adsız ürün"}</span>
                  <span className="mt-1 block text-sm text-slate-500">{product.barkodNo} · {product.anaKategori || "Kategori yok"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
