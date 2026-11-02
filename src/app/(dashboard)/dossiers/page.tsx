import { redirect } from "next/navigation";

// The list lives at "/" (home). Kept so old links to /dossiers still work.
export default function DossiersRedirect() {
  redirect("/");
}
