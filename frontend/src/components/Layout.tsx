import { type FormEvent, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { apiClient, getErrorMessage } from "../services/api";

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
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let active = true;
    apiClient.session().then((response) => {
      if (!active) return;
      const valid = response.data.data.authenticated;
      setAuthenticated(valid);
      if (!valid) setPasswordOpen(true);
      setSessionReady(true);
    }).catch(() => {
      if (!active) return;
      setAuthenticated(false);
      setPasswordOpen(true);
      setSessionReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      setAuthenticated(false);
      setPassword("");
      setPasswordError("Oturum süreniz doldu. Yeniden giriş yapın.");
      setPasswordOpen(true);
    };
    window.addEventListener("depo:session-expired", onSessionExpired);
    return () => window.removeEventListener("depo:session-expired", onSessionExpired);
  }, []);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiClient.login(password);
      setAuthenticated(true);
      setPasswordOpen(false);
      setPasswordError("");
    } catch (error) {
      setPasswordError(getErrorMessage(error));
    }
  }

  async function logout() {
    try {
      await apiClient.logout();
      setAuthenticated(false);
      setPasswordOpen(true);
      setPassword("");
      setPasswordError("");
    } catch (error) {
      setPasswordError(getErrorMessage(error));
    }
  }

  return (
    <div className="min-h-dvh bg-surface text-slate-900">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-navy text-white">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="text-lg font-semibold">Öztürk Ambalaj Deposu</div>
          <div className="text-sm text-blue-100 mt-1">Barkodlu ürün kayıt</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {desktopLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  isActive ? "bg-white text-navy" : "text-blue-100 hover:bg-white/10"
                }`
              }
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        {authenticated && (
          <button onClick={logout} className="m-3 rounded-xl px-4 py-3 text-left text-sm text-blue-100 hover:bg-white/10">
            Oturumu kapat
          </button>
        )}
      </aside>

      <header className="lg:hidden sticky top-0 z-20 bg-navy px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-semibold">Öztürk Ambalaj Deposu</div>
            <div className="text-xs text-blue-100">Barkodlu ürün kayıt</div>
          </div>
          {authenticated && <button onClick={logout} className="rounded-lg px-3 py-2 text-xs text-blue-100 hover:bg-white/10">Çıkış</button>}
        </div>
      </header>

      {!online && (
        <div className="lg:ml-64 bg-red-600 text-white text-center text-sm py-2">
          İnternet bağlantısı yok. Kayıt işlemleri şu anda yapılamaz.
        </div>
      )}

      <main id="main-content" className="mx-auto w-full max-w-6xl px-3 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-5 lg:ml-64 lg:w-auto lg:pb-8">
        {sessionReady && authenticated ? (
          <Outlet />
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center text-slate-600 shadow-sm">
            {sessionReady ? "Devam etmek için uygulama şifresiyle giriş yapın." : "Oturum kontrol ediliyor…"}
          </div>
        )}
      </main>

      <nav aria-label="Ana gezinme" className="lg:hidden fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[10px] leading-tight sm:text-[11px] ${
                  isActive ? "text-navy font-semibold" : "text-slate-500"
                }`
              }
            >
              <span className="text-lg leading-none">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
      {passwordOpen && sessionReady && !authenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <form
            onSubmit={submitPassword}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-password-title"
          >
            <div>
              <h2 id="menu-password-title" className="text-lg font-semibold text-navy-dark">Uygulamaya giriş</h2>
              <p className="mt-1 text-sm text-slate-600">Devam etmek için uygulama şifresini yazın.</p>
            </div>
            <label className="block">
              <span className="sr-only">Menü şifresi</span>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-navy"
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "menu-password-error" : undefined}
              />
            </label>
            {passwordError && <p id="menu-password-error" className="text-sm text-red-700">{passwordError}</p>}
            <button type="submit" className="w-full rounded-xl bg-navy px-4 py-3 font-semibold text-white">
              Giriş yap
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
