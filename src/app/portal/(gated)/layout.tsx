// Wraps every page under /portal EXCEPT /portal/security (a sibling outside this route group).
// TODO when /portal/security is ported: redirect clients whose AQUA_CLIENTE_USUARIO.NCAMBIO_PASS_OBLIG = 1
// to "/portal/security" (read it fresh from the DB, not from the JWT). Not active yet because that
// page does not exist here and the redirect would land on a 404.
export default function PortalGatedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
