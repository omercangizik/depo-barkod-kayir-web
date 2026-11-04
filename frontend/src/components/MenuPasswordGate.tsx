import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { isAdminMenuUnlocked, onAdminMenuAccessChange, unlockAdminMenu } from "../services/adminAccess";

export function MenuPasswordGate({ children, title }: { children: ReactNode; title: string }) {
  const [unlocked, setUnlocked] = useState(isAdminMenuUnlocked);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => onAdminMenuAccessChange(() => setUnlocked(isAdminMenuUnlocked())), []);

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unlockAdminMenu(password)) {
      setError("");
    } else {
      setError("Şifre yanlış. Tekrar deneyin.");
      setPassword("");
    }
  }

  if (unlocked) return <>{children}</>;
  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-white p-5 shadow-sm">
      <h1 className="text-xl font-semibold text-navy-dark">{title} menüsü</h1>
      <p className="mt-1 text-sm text-slate-600">Devam etmek için menü şifresini girin.</p>
      <form onSubmit={unlock} className="mt-4 space-y-3">
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
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "menu-password-error" : undefined}
          />
        </label>
        {error && <p id="menu-password-error" className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="w-full rounded-xl bg-navy px-4 py-3 font-semibold text-white">Devam et</button>
      </form>
    </div>
  );
}
