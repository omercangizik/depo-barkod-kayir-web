import { type FormEvent, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { isAdminMenuUnlocked, lockAdminMenu, onAdminMenuAccessChange, unlockAdminMenu } from "../services/adminAccess";

const userLinks = [
  { to: "/", label: "Ana Sayfa", icon: "⌂" },
  { to: "/scan", label: "Barkod", icon: "▦" },
  { to: "/products", label: "Ürünler", icon: "☰" },
];
const adminLinks = [
  { to: "/import", label: "Aktar", icon: "↑" },
  { to: "/categories", label: "Kategori", icon: "▣" },
  { to: "/export", label: "Excel", icon: "↓" },
];

export function Layout() {
  const online = useOnlineStatus();
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [immersive, setImmersive] = useState(false);
  const [standalone, setStandalone] = useState(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return Boolean(navigatorWithStandalone.standalone || window.matchMedia("(display-mode: standalone)").matches);
  });
  const [adminUnlocked, setAdminUnlocked] = useState(isAdminMenuUnlocked);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    const unsubscribeAdmin = onAdminMenuAccessChange(() => {
      const unlocked = isAdminMenuUnlocked();
      setAdminUnlocked(unlocked);
      if (unlocked) setAdminPanelOpen(true);
      else setAdminPanelOpen(false);
    });
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => setStandalone(displayMode.matches);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    displayMode.addEventListener?.("change", onDisplayModeChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      displayMode.removeEventListener?.("change", onDisplayModeChange);
      unsubscribeAdmin();
    };
  }, []);

  function toggleAdminMenu() {
    setAdminPasswordError("");
    setAdminPanelOpen((open) => !open);
  }

  function closeAdminSession() {
    lockAdminMenu();
    setAdminPanelOpen(false);
  }

  function submitAdminPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unlockAdminMenu(adminPassword)) {
      setAdminPasswordError("Şifre yanlış. Tekrar deneyin.");
      setAdminPassword("");
      return;
    }
    setAdminPassword("");
    setAdminPasswordError("");
    setAdminPanelOpen(true);
  }

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
  const adminPasswordForm = (inputId: string) => (
    <form onSubmit={submitAdminPassword} className="space-y-2 rounded-xl bg-white p-3 text-slate-800 shadow-lg">
      <label className="block text-sm font-medium" htmlFor={inputId}>Yönetici şifresi</label>
      <input
        id={inputId}
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        value={adminPassword}
        onChange={(event) => setAdminPassword(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        autoFocus
      />
      {adminPasswordError && <p role="alert" className="text-sm text-red-700">{adminPasswordError}</p>}
      <button type="submit" className="w-full rounded-lg bg-navy px-3 py-2.5 font-semibold text-white">Giriş</button>
    </form>
  );

  return (
    <div className={`${immersive ? "fixed inset-0 z-40 h-[100dvh] w-full overflow-y-auto overscroll-contain" : "min-h-dvh"} bg-surface text-slate-900`}>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-orange-100 bg-white text-slate-800">
        <div className="border-b border-orange-100 px-5 py-6">
          <img src="/ozturk-ambalaj-logo.png" alt="Öztürk Ambalaj" className="h-auto w-full object-contain" />
          <div className="mt-2 text-xs font-medium text-orange-800">Depo Yönetim Sistemi</div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{userLinks.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${isActive ? "bg-orange-50 text-navy-dark" : "text-slate-600 hover:bg-orange-50"}`
          }><span className="text-lg">{link.icon}</span>{link.label}</NavLink>
        ))}
          {adminUnlocked && adminLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${isActive ? "bg-orange-50 text-navy-dark" : "text-slate-600 hover:bg-orange-50"}`
            }><span className="text-lg">{link.icon}</span>{link.label}</NavLink>
          ))}
          {adminPanelOpen && !adminUnlocked && <div className="mt-3">{adminPasswordForm("desktop-admin-password")}</div>}
        </nav>
        <div className="space-y-2 p-3 text-slate-700">
          <button type="button" onClick={adminUnlocked ? closeAdminSession : toggleAdminMenu} className="w-full rounded-lg border border-orange-200 px-3 py-2 text-left text-sm font-medium hover:bg-orange-50">
            {adminUnlocked ? "🔒 Yönetici menüsünü kilitle" : "🔐 Yönetici"}
          </button>
          {fullscreenButton}
        </div>
      </aside>
      <header className="lg:hidden sticky top-0 z-20 border-b border-orange-100 bg-white px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] text-slate-800 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <img src="/ozturk-ambalaj-logo.png" alt="Öztürk Ambalaj Deposu" className="h-12 w-auto max-w-[62vw] object-contain object-left" />
          {fullscreenButton}
        </div>
      </header>
      {!standalone && !fullscreen && !immersive && !document.fullscreenEnabled && <div role="note" className="bg-orange-50 px-4 py-2 text-center text-xs text-orange-900">iPhone'da tarayıcı çubuklarını gizlemek için Safari'de Paylaş → Ana Ekrana Ekle ile uygulamayı açın.</div>}
      {!online && <div className="lg:ml-64 bg-red-600 text-white text-center text-sm py-2">İnternet bağlantısı yok. Kayıt işlemleri şu anda yapılamaz.</div>}
      <main id="main-content" className="mx-auto w-full max-w-6xl px-3 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-5 lg:ml-64 lg:w-auto lg:pb-8"><Outlet /></main>
      {adminPanelOpen && <div className="lg:hidden fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
        {adminUnlocked ? (
          <>
            <nav aria-label="Yönetici menüsü" className="grid grid-cols-3 gap-2">
              {adminLinks.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setAdminPanelOpen(false)} className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm ${isActive ? "bg-orange-50 font-semibold text-navy-dark" : "text-slate-700 hover:bg-slate-50"}`}><span className="text-lg">{link.icon}</span>{link.label}</NavLink>)}
            </nav>
            <button type="button" onClick={closeAdminSession} className="mt-2 w-full rounded-lg py-2 text-sm text-slate-500 underline underline-offset-2">Yönetici oturumunu kapat</button>
          </>
        ) : adminPasswordForm("mobile-admin-password")}
      </div>}
      <nav aria-label="Ana gezinme" className="lg:hidden fixed inset-x-0 bottom-0 z-20 border-t border-orange-100 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(124,45,18,0.08)]">
        <div className="mx-auto grid max-w-xl grid-cols-4">{userLinks.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) =>
            `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-center text-[9px] leading-tight sm:text-[11px] ${isActive ? "text-navy font-semibold" : "text-slate-500"}`
          }><span className="text-lg leading-none">{link.icon}</span>{link.label}</NavLink>
        ))}
          <button type="button" onClick={toggleAdminMenu} aria-expanded={adminPanelOpen} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-center text-[9px] leading-tight sm:text-[11px] ${adminUnlocked ? "font-semibold text-navy" : "text-slate-500"}`}>
            <span className="text-lg leading-none">{adminUnlocked ? "🔓" : "🔐"}</span>Yönetici
          </button>
        </div>
      </nav>
    </div>
  );
}
