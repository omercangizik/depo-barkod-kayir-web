import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

const links = [
  { to: "/", label: "Ana Sayfa", icon: "⌂" },
  { to: "/scan", label: "Barkod", icon: "▦" },
  { to: "/products", label: "Ürünler", icon: "☰" },
  { to: "/import", label: "Aktar", icon: "↑" },
  { to: "/categories", label: "Kategori", icon: "▣" },
];
const desktopLinks = [...links, { to: "/export", label: "Excel", icon: "↓" }];

export function Layout() {
  const online = useOnlineStatus();
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [immersive, setImmersive] = useState(false);
  const [standalone, setStandalone] = useState(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return Boolean(navigatorWithStandalone.standalone || window.matchMedia("(display-mode: standalone)").matches);
  });

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => setStandalone(displayMode.matches);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    displayMode.addEventListener?.("change", onDisplayModeChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      displayMode.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => setImmersive(false));
      return;
    }
    if (immersive) {
      setImmersive(false);
      return;
    }
    try {
      if (!standalone && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return;
      }
    } catch {
      // iOS Safari and some embedded browsers reject the Fullscreen API.
    }
    // Keep the app usable in browsers that do not expose the Fullscreen API.
    setImmersive(true);
  }

  const inFullscreen = fullscreen || immersive;
  const fullscreenLabel = immersive
    ? "Geniş görünümden çık"
    : fullscreen
      ? "Tam ekrandan çık"
      : standalone
        ? "Ekranı genişlet"
        : "Tam ekran / geniş görünüm";
  const fullscreenButton = (
    <button type="button" onClick={() => void toggleFullscreen()} className="rounded-lg border border-current/20 px-3 py-2 text-sm font-medium hover:bg-black/5" aria-label={fullscreenLabel}>
      {inFullscreen ? "⛶ Görünümden çık" : "⛶ Tam ekran"}
    </button>
  );

  return (
    <div className={`${immersive ? "fixed inset-0 z-40 h-[100dvh] w-full overflow-y-auto overscroll-contain" : "min-h-dvh"} bg-surface text-slate-900`}>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-navy text-white">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="text-lg font-semibold">Öztürk Ambalaj Deposu</div>
          <div className="text-sm text-blue-100 mt-1">Barkodlu ürün kayıt</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">{desktopLinks.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${isActive ? "bg-white text-navy" : "text-blue-100 hover:bg-white/10"}`
          }><span className="text-lg">{link.icon}</span>{link.label}</NavLink>
        ))}</nav>
        <div className="p-3 text-blue-100">{fullscreenButton}</div>
      </aside>
      <header className="lg:hidden sticky top-0 z-20 bg-navy px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between gap-2">
          <div><div className="font-semibold">Öztürk Ambalaj Deposu</div><div className="text-xs text-blue-100">Barkodlu ürün kayıt</div></div>
          {fullscreenButton}
        </div>
      </header>
      {!standalone && !fullscreen && !immersive && !document.fullscreenEnabled && <div role="note" className="bg-blue-50 px-4 py-2 text-center text-xs text-blue-900">iPhone'da tarayıcı çubuklarını gizlemek için Safari'de Paylaş → Ana Ekrana Ekle ile uygulamayı açın.</div>}
      {!online && <div className="lg:ml-64 bg-red-600 text-white text-center text-sm py-2">İnternet bağlantısı yok. Kayıt işlemleri şu anda yapılamaz.</div>}
      <main id="main-content" className="mx-auto w-full max-w-6xl px-3 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-5 lg:ml-64 lg:w-auto lg:pb-8"><Outlet /></main>
      <nav aria-label="Ana gezinme" className="lg:hidden fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="mx-auto grid max-w-xl grid-cols-5">{links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) =>
            `flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[10px] leading-tight sm:text-[11px] ${isActive ? "text-navy font-semibold" : "text-slate-500"}`
          }><span className="text-lg leading-none">{link.icon}</span>{link.label}</NavLink>
        ))}</div>
      </nav>
    </div>
  );
}
