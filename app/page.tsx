import { Brand, SiteFooter } from "@/components/brand";

const steps = [
  {
    title: "1 · Teilen",
    body: "Link oder Video aus Instagram und TikTok ins Share Sheet, fertig.",
  },
  {
    title: "2 · Verarbeiten",
    body: "Ablauf, Material und Coaching-Punkte werden strukturiert erfasst.",
  },
  {
    title: "3 · Trainieren",
    body: "Übung im Katalog, auf dem Handy und der Watch, offline verfügbar.",
  },
];

export default function HomePage() {
  return (
    <div className="home">
      <header className="site-header">
        <Brand />
        <a href="/login" className="pill pill--solid">
          Login
        </a>
      </header>

      <main className="home__main">
        <span className="home__status">Coming soon</span>

        <h1 className="home__title">
          Übungen aus dem Reel.
          <br />
          <em>Direkt aufs Feld.</em>
        </h1>

        <p className="home__lede">
          Teile ein Trainingsvideo, Coachbook macht daraus eine Übung mit
          Ablauf, Coaching-Punkten und Feldskizze. Fertig, bevor das Training
          beginnt.
        </p>

        <section className="card example" aria-labelledby="example-title">
          <div className="example__text">
            <div className="eyebrow">Beispiel</div>
            <div id="example-title" className="example__title">
              Passversuch im Dreieck
            </div>
            <p className="example__body">
              Drei Spieler, zwei Hütchen, ein Ball. Zwei Pässe, dann Laufweg in
              die Tiefe. Dauer 12 Minuten, U9 bis U11.
            </p>
            <div className="example__chips">
              <span className="chip chip--pitch">Passspiel</span>
              <span className="chip">12 Min</span>
              <span className="chip">Hütchen</span>
            </div>
          </div>

          <div className="example__figure">
            <svg viewBox="0 0 400 300" role="img" aria-label="Feldskizze mit drei Spielern und Laufwegen">
              <rect x="24" y="24" width="352" height="252" rx="6" fill="none" stroke="#f6f7f4" strokeOpacity="0.5" strokeWidth="2" />
              <line x1="200" y1="24" x2="200" y2="276" stroke="#f6f7f4" strokeOpacity="0.35" strokeWidth="2" />
              <circle cx="200" cy="150" r="36" fill="none" stroke="#f6f7f4" strokeOpacity="0.35" strokeWidth="2" />
              <circle cx="110" cy="110" r="7" fill="#f2b01e" />
              <circle cx="110" cy="200" r="7" fill="#f2b01e" />
              <circle cx="250" cy="150" r="7" fill="#f2b01e" />
              <path d="M120 104 L238 146" stroke="#5be08f" strokeWidth="3" strokeDasharray="6 6" fill="none" />
              <path d="M118 194 L236 156" stroke="#5be08f" strokeWidth="3" strokeDasharray="6 6" fill="none" />
              <path d="M262 160 L330 210" stroke="#f6f7f4" strokeWidth="3" fill="none" />
              <polygon points="334,214 320,212 326,202" fill="#f6f7f4" />
              <polygon points="98,96 122,96 110,74" fill="#f2b01e" />
            </svg>
          </div>
        </section>

        <section className="steps" aria-label="So funktioniert es">
          {steps.map((step) => (
            <article key={step.title} className="card step">
              <div className="step__title">{step.title}</div>
              <div className="step__body">{step.body}</div>
            </article>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
