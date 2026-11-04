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

type CameraZoomRange = { min: number; max: number; step: number };
type ExtendedCameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: CameraZoomRange;
};
type ExtendedTrackConstraint = MediaTrackConstraintSet & {
  focusMode?: string;
  zoom?: number;
};

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
  const lastCodeRef = useRef<{ barkodNo: string; koliDisBarkodNo: string }>({ barkodNo: "", koliDisBarkodNo: "" });
  const barcodeTargetRef = useRef<"barkodNo" | "koliDisBarkodNo">("barkodNo");
  const audioContextRef = useRef<AudioContext | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [zoomRange, setZoomRange] = useState<CameraZoomRange | null>(null);
  const [zoomValue, setZoomValue] = useState(1);
  const [manual, setManual] = useState("");
  const [barcodeTarget, setBarcodeTarget] = useState<"barkodNo" | "koliDisBarkodNo">("barkodNo");
  const [innerBarcode, setInnerBarcode] = useState("");
  const [outerBarcode, setOuterBarcode] = useState("");
  const [openingForm, setOpeningForm] = useState(false);
  const [matches, setMatches] = useState<{ barkodNo: string; koliDisBarkodNo: string; urunAdi: string; anaKategori: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState("Kamera bağlanıyor...");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCode = useCallback((raw: string) => {
    const code = raw.trim();
    const target = barcodeTargetRef.current;
    if (!code || code === lastCodeRef.current[target]) return;
    lastCodeRef.current[target] = code;
    setError("");
    if (target === "koliDisBarkodNo") setOuterBarcode(code);
    else setInnerBarcode(code);
    setStatus(`${target === "koliDisBarkodNo" ? "Koli dış barkodu" : "Ürün/iç barkodu"} okundu: ${code}. Diğer barkodu da okutabilir veya ürün ekranına geçebilirsiniz.`);
    if (navigator.vibrate) navigator.vibrate(80);
    try {
      if (window.AudioContext) {
        const context = audioContextRef.current ?? new window.AudioContext();
        audioContextRef.current = context;
        void context.resume().then(() => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 880;
          gain.gain.setValueAtTime(0.001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.15);
        });
      }
    } catch {
      // Vibration still provides feedback when browser audio is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!cameraOn) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setCameraReady(false);
      setZoomRange(null);
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
    setZoomRange(null);
    setStatus("Kamera izni bekleniyor...");
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 });
    const callback: Parameters<typeof reader.decodeFromVideoDevice>[2] = (result) => {
      if (cancelled || !result) return;
      void handleCode(result.getText());
    };

    const videoConstraints: MediaTrackConstraints = {
      ...(deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: "environment" } }),
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };
    const start = reader.decodeFromConstraints(
      { audio: false, video: videoConstraints },
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
        setStatus("Barkodun tamamı görüntü içinde kaldığı sürece özel bir çerçeveye hizalamanız gerekmez. Uzaktaysa yakınlaştırmayı artırın.");
        const videoTrack = video.srcObject instanceof MediaStream
          ? video.srcObject.getVideoTracks()[0]
          : undefined;
        if (videoTrack && "getCapabilities" in videoTrack) {
          try {
            const capabilities = videoTrack.getCapabilities() as ExtendedCameraCapabilities;
            const zoom = capabilities.zoom;
            if (zoom && zoom.max > zoom.min) {
              setZoomRange(zoom);
              setZoomValue(videoTrack.getSettings().zoom ?? zoom.min);
            }
            if (capabilities.focusMode?.includes("continuous")) {
              await videoTrack.applyConstraints({
                advanced: [{ focusMode: "continuous" } as ExtendedTrackConstraint],
              });
            }
          } catch {
            // Kamera veya tarayıcı bu isteği desteklemese de barkod taraması devam eder.
          }
        }
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

  async function changeZoom(value: number) {
    setZoomValue(value);
    const videoTrack = videoRef.current?.srcObject instanceof MediaStream
      ? videoRef.current.srcObject.getVideoTracks()[0]
      : undefined;
    if (!videoTrack || !zoomRange) return;
    try {
      const capabilities = videoTrack.getCapabilities() as ExtendedCameraCapabilities;
      const advanced: ExtendedTrackConstraint[] = [];
      if (capabilities.focusMode?.includes("continuous")) {
        advanced.push({ focusMode: "continuous" });
      }
      advanced.push({ zoom: value });
      await videoTrack.applyConstraints({ advanced });
    } catch {
      setError("Bu kamerada yakınlaştırma uygulanamadı. Telefonu barkoda biraz yaklaştırıp sabit tutun.");
    }
  }

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
      const exactBarcode = items.find(
        (item) => item.barkodNo.trim() === query || item.koliDisBarkodNo.trim() === query,
      );
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
        if (barcodeTarget === "koliDisBarkodNo") setOuterBarcode(query);
        else setInnerBarcode(query);
        setStatus(`${barcodeTarget === "koliDisBarkodNo" ? "Koli dış barkodu" : "Ürün/iç barkodu"} alana eklendi. Diğer barkodu girebilir veya ürün ekranına geçebilirsiniz.`);
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

  async function openProductForm() {
    setError("");
    setOpeningForm(true);
    const inner = innerBarcode.trim();
    const outer = outerBarcode.trim();
    try {
      for (const code of [inner, outer].filter(Boolean)) {
        try {
          const response = await apiClient.getByBarcode(code);
          const params = new URLSearchParams();
          if (inner) params.set("innerBarcode", inner);
          if (outer) params.set("outerBarcode", outer);
          navigate(`/products/${encodeURIComponent(response.data.data.barkodNo)}${params.size ? `?${params}` : ""}`);
          return;
        } catch (err) {
          if (!getErrorMessage(err).toLocaleLowerCase("tr-TR").includes("bulunamadı")) throw err;
        }
      }
      const params = new URLSearchParams();
      if (inner) params.set("innerBarcode", inner);
      if (outer) params.set("outerBarcode", outer);
      navigate(`/products/new${params.size ? `?${params}` : ""}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setOpeningForm(false);
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
          className={`${cameraOn ? "block" : "hidden"} h-full w-full object-contain`}
          muted
          playsInline
          autoPlay
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
            {cameraOn ? "Kamera görüntüsü bekleniyor..." : "Kamera kapalı. Manuel barkod girişini kullanabilirsiniz."}
          </div>
        )}
      </div>
      <p className="text-sm text-slate-600" aria-live="polite">{status}</p>
      <fieldset className="rounded-xl bg-white p-3 shadow-sm">
        <legend className="px-1 text-sm font-medium text-slate-700">Kamerayla okutulacak barkod türü</legend>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["barkodNo", "Ürün / iç barkod"],
            ["koliDisBarkodNo", "Koli dış barkodu"],
          ] as const).map(([field, label]) => (
            <button
              key={field}
              type="button"
              aria-pressed={barcodeTarget === field}
              onClick={() => { barcodeTargetRef.current = field; setBarcodeTarget(field); }}
              className={`rounded-lg border px-3 py-2 text-sm ${barcodeTarget === field ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">İki barkod türünü de okutun veya elle girin. İkisinden biri yeterliyse diğerini boş bırakabilirsiniz.</p>
        <label className="block text-sm font-medium text-slate-700" htmlFor="inner-barcode">Ürün / iç barkod</label>
        <input id="inner-barcode" value={innerBarcode} onChange={(event) => setInnerBarcode(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Ürün barkodunu okutun veya yazın" inputMode="numeric" autoComplete="off" />
        <label className="block text-sm font-medium text-slate-700" htmlFor="outer-barcode">Koli dış barkodu</label>
        <input id="outer-barcode" value={outerBarcode} onChange={(event) => setOuterBarcode(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Koli barkodunu okutun veya yazın" inputMode="numeric" autoComplete="off" />
        <button type="button" onClick={() => void openProductForm()} disabled={openingForm} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60">
          {openingForm ? "Ürün aranıyor..." : "Ürün kaydına geç"}
        </button>
        <button type="button" onClick={() => { setInnerBarcode(""); setOuterBarcode(""); lastCodeRef.current = { barkodNo: "", koliDisBarkodNo: "" }; setStatus("Barkod alanları temizlendi. Kamerayla okutabilir veya elle girebilirsiniz."); }} className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700">
          Barkod alanlarını temizle
        </button>
      </section>
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
      {cameraReady && zoomRange && (
        <label className="block rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm">
          <span className="mb-2 flex items-center justify-between">
            <span>Barkodu yakınlaştır</span>
            <span>{zoomValue.toFixed(1)}×</span>
          </span>
          <input
            aria-label="Kamera yakınlaştırma"
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step={zoomRange.step || 0.1}
            value={zoomValue}
            onChange={(event) => void changeZoom(Number(event.target.value))}
            className="w-full accent-slate-800"
          />
        </label>
      )}
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
                  <span className="mt-1 block text-sm text-slate-500">{product.barkodNo}{product.koliDisBarkodNo ? ` · Koli: ${product.koliDisBarkodNo}` : ""} · {product.anaKategori || "Kategori yok"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
