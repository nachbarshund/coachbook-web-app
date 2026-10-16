import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { hasAdminSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { AdminNav } from "./admin-nav";

// Admin reads the session cookie on every request, so it blocks on the server instead of prerendering.
export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasAdminSession())) {
    redirect("/login");
  }

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <Brand href="/admin" />
        <AdminNav />
        <div className="admin__sidebar-foot">
          <span>Angemeldet als Admin</span>
          <form action={logout}>
            <button type="submit">Abmelden</button>
          </form>
        </div>
      </aside>
      <main className="admin__main">{children}</main>
    </div>
  );
}
