"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getClientUsersByClient,
  createClientUser,
  updateClientUser,
  setClientUserStatus,
  generateClientUserPassword,
  setClientUserEmailVerified,
  type ClientUserListItem,
  type ClientUserRole,
} from "@/lib/actions/clientUsers";
import { confirmToast } from "@/lib/confirm-toast";
import { btn, btnPrimary, input, muted } from "@/components/ui/styles";

const pill = "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium";

/** Portal users of one client, managed by an internal admin (nobody self-registers). */
export default function ClientUsersSection({ clientId }: { clientId: number }) {
  const [users, setUsers] = useState<ClientUserListItem[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(() => {
    getClientUsersByClient(clientId)
      .then((d) => { setUsers(d); setLoadError(null); })
      .catch(() => setLoadError("No se pudieron cargar los usuarios del portal."));
  }, [clientId]);
  useEffect(() => { reload(); }, [reload]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Usuarios del portal</h3>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="min-h-11 text-sm font-medium text-primary hover:underline sm:min-h-0">+ Agregar usuario</button>
        )}
      </div>
      {loadError && <p className="text-sm text-danger">{loadError}</p>}
      {users === null && !loadError && <p className={muted}>Cargando...</p>}
      {users?.map((u) => <UserRow key={u.id} user={u} onChanged={reload} />)}
      {adding && <NewUser clientId={clientId} onDone={() => { setAdding(false); reload(); }} />}
      {users && users.length === 0 && !adding && <p className={muted}>Este cliente no tiene usuarios de portal.</p>}
    </section>
  );
}

function UserRow({ user, onChanged }: { user: ClientUserListItem; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menu]);

  function act(fn: () => Promise<{ ok: true; data?: unknown } | { ok: false; error: string }>, after?: (data: unknown) => void) {
    setMenu(false);
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error); return; }
      after?.(r.data);
      onChanged();
    });
  }

  async function toggleActive() {
    if (user.active && !(await confirmToast(`¿Desactivar a "${user.name}"? No podrá iniciar sesión en el portal.`))) { setMenu(false); return; }
    act(() => setClientUserStatus(user.id, user.active ? 2 : 1));
  }
  async function toggleVerified() {
    if (user.emailVerified) {
      const msg = user.hasPassword
        ? `¿Marcar el correo de "${user.name}" como no verificado? No podrá enviar solicitudes hasta verificarlo de nuevo.`
        : `¿Marcar el correo de "${user.name}" como no verificado? Como usa Google, se verificará solo en su próximo inicio de sesión.`;
      if (!(await confirmToast(msg))) { setMenu(false); return; }
    }
    act(() => setClientUserEmailVerified(user.id, !user.emailVerified));
  }
  async function genPassword() {
    if (user.hasPassword && !user.mustChangePassword && !(await confirmToast(`¿Generar una nueva contraseña para "${user.name}"? La actual, que ya personalizó, dejará de funcionar de inmediato.`))) { setMenu(false); return; }
    act(() => generateClientUserPassword(user.id), (d) => setPassword((d as { temporaryPassword: string }).temporaryPassword));
  }

  const item = "block min-h-11 w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-bg disabled:opacity-50 sm:min-h-0";
  return (
    <div className={"space-y-2 rounded-md border border-border p-3" + (user.active ? "" : " opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <LoginIcon google={!user.hasPassword} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-medium text-text">{user.name}</p>
              <span className={`${pill} ${user.role === "CLIENT_ADMIN" ? "bg-primary/10 text-primary" : "bg-bg text-text-muted"}`}>
                {user.role === "CLIENT_ADMIN" ? "Administrador" : "Usuario"}
              </span>
              {!user.active && <span className={`${pill} bg-danger/10 text-danger`}>Inactivo</span>}
              <span className={`${pill} ${user.emailVerified ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                {user.emailVerified ? "Correo verificado" : "Correo sin verificar"}
              </span>
              {user.hasPassword && (
                <span className={`${pill} ${user.mustChangePassword ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                  {user.mustChangePassword ? "Contraseña temporal" : "Contraseña personalizada"}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {!user.hasPassword
                ? "Solo puede iniciar sesión con Google."
                : user.mustChangePassword
                  ? "Tiene una contraseña temporal: deberá cambiarla al iniciar sesión."
                  : "Puede iniciar sesión con correo y contraseña, o con Google."}
            </p>
            {!user.emailVerified && <p className="mt-0.5 text-xs text-text-muted">No podrá enviar solicitudes hasta que el correo esté verificado.</p>}
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          </div>
        </div>
        <div ref={ref} className="relative shrink-0">
          <button type="button" onClick={() => setMenu((o) => !o)} aria-haspopup="menu" aria-expanded={menu} aria-label="Más acciones" className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-muted hover:bg-bg hover:text-text sm:min-h-0 sm:min-w-0 sm:p-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="12" cy="5" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="12" cy="19" r="1.75" /></svg>
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
              <button role="menuitem" onClick={toggleActive} disabled={pending} className={`${item} ${user.active ? "text-danger" : "text-primary"}`}>{user.active ? "Desactivar" : "Reactivar"}</button>
              <button role="menuitem" onClick={() => { setMenu(false); setChangingRole(true); }} className={`${item} text-text`}>Cambiar rol</button>
              <button role="menuitem" onClick={genPassword} disabled={pending} className={`${item} text-text`}>{user.hasPassword ? "Generar nueva contraseña" : "Generar contraseña"}</button>
              <button role="menuitem" onClick={toggleVerified} disabled={pending} className={`${item} text-text`}>{user.emailVerified ? "Marcar como no verificado" : "Marcar correo como verificado"}</button>
            </div>
          )}
        </div>
      </div>
      {changingRole && <RoleChange user={user} onDone={() => setChangingRole(false)} onChanged={onChanged} />}
      {password && <PasswordReveal password={password} onDone={() => setPassword(null)} />}
    </div>
  );
}

function RoleChange({ user, onDone, onChanged }: { user: ClientUserListItem; onDone: () => void; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const [role, setRole] = useState<ClientUserRole>(user.role);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2 rounded-md border border-dashed border-primary/50 bg-primary/5 p-2.5">
      <select value={role} onChange={(e) => setRole(e.target.value as ClientUserRole)} className={input} autoFocus>
        <option value="CLIENT_USER">Usuario</option>
        <option value="CLIENT_ADMIN">Administrador</option>
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={pending || role === user.role} onClick={() => start(async () => {
          const r = await updateClientUser({ id: user.id, role });
          if (!r.ok) { setError(r.error); return; }
          onChanged(); onDone();
        })}>{pending ? "Guardando..." : "Guardar rol"}</button>
        <button className={btn} onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

/** Shows a generated password exactly once. Only the hash is stored; nothing can show it again. */
function PasswordReveal({ password, onDone }: { password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2.5 rounded-md border border-primary/40 bg-primary/5 p-3">
      <p className="text-xs font-medium text-text">Copia esta contraseña ahora: no volverá a mostrarse.</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text">{password}</code>
        <button type="button" className={btn} onClick={async () => {
          try { await navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* still selectable */ }
        }}>{copied ? "Copiado" : "Copiar"}</button>
      </div>
      <button type="button" onClick={onDone} className={btnPrimary + " w-full"}>Ya la copié</button>
    </div>
  );
}

function NewUser({ clientId, onDone }: { clientId: number; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClientUserRole>("CLIENT_USER");
  const [withPassword, setWithPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  if (password) {
    return (
      <div className="space-y-2 rounded-md border border-dashed border-primary/50 bg-primary/5 p-3">
        <p className="text-xs text-text-muted">Usuario creado. Entrégale esta contraseña temporal: deberá cambiarla en su primer inicio de sesión.</p>
        <PasswordReveal password={password} onDone={onDone} />
      </div>
    );
  }
  return (
    <form
      className="space-y-2 rounded-md border border-dashed border-primary/50 bg-primary/5 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createClientUser({ clientId, name, email, role, generatePassword: withPassword });
          if (!r.ok) { setError(r.error); return; }
          if (r.data.temporaryPassword) setPassword(r.data.temporaryPassword);
          else onDone();
        });
      }}
    >
      <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" required autoFocus />
      <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo (con el que iniciará sesión)" type="email" required />
      <select className={input} value={role} onChange={(e) => setRole(e.target.value as ClientUserRole)}>
        <option value="CLIENT_USER">Usuario</option>
        <option value="CLIENT_ADMIN">Administrador</option>
      </select>
      <label className="flex items-start gap-2 text-sm text-text">
        <input type="checkbox" checked={withPassword} onChange={(e) => setWithPassword(e.target.checked)} className="mt-1" />
        <span>Generar también una contraseña temporal (acceso con correo, además de Google)</span>
      </label>
      <p className="text-xs text-text-muted">
        {withPassword
          ? "La contraseña se genera sola y se muestra una vez al guardar. Deberá cambiarla al iniciar sesión."
          : "Solo podrá iniciar sesión con Google, con exactamente este correo. Puedes generar una contraseña después."}
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={pending}>{pending ? "Guardando..." : "Guardar usuario"}</button>
        <button type="button" className={btn} onClick={onDone}>Cancelar</button>
      </div>
    </form>
  );
}

function LoginIcon({ google }: { google: boolean }) {
  if (google) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface" title="Inicia sesión con Google">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.89c2.27-2.09 3.58-5.17 3.58-8.82Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.89-3.02c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.27v3.11A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.27a12 12 0 0 0 0 10.8l4.02-3.11Z" />
          <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4.02 3.11C6.23 6.87 8.88 4.75 12 4.75Z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" title="Inicia sesión con correo y contraseña">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}
