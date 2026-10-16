import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Übungen",
};

export default function ExercisesPage() {
  return (
    <>
      <header className="admin__head">
        <div>
          <div className="eyebrow">Katalog</div>
          <div className="admin__title">Übungen</div>
        </div>
        <Link href="/admin/upload" className="pill pill--solid">
          Video hochladen
        </Link>
      </header>

      <section className="card empty" aria-live="polite">
        Noch keine Übungen. Lade ein Video hoch, um die erste Übung anzulegen.
      </section>
    </>
  );
}
