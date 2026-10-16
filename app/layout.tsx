import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Coachbook",
    template: "%s · Coachbook",
  },
  description: "Trainingsübungen aus Reels, direkt aufs Feld.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;
  const branch = process.env.NEXT_PUBLIC_DEPLOY_BRANCH;
  const label =
    deployEnv === "preview" ? `Preview · ${branch || "unknown"}` : deployEnv === "production" ? null : "Lokal";

  return (
    <html lang="de">
      <body>
        {label ? (
          <div className="env-ribbon" aria-label={`Umgebung: ${label}`}>
            <span>{label}</span>
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
