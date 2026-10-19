import type { Metadata } from "next";
import { UploadModes } from "./upload-modes";

export const metadata: Metadata = {
  title: "Neue Übung",
};

export default function UploadPage() {
  return (
    <>
      <header className="admin__head">
        <div>
          <div className="eyebrow">Analyse</div>
          <div className="admin__title">Neue Übung</div>
        </div>
      </header>

      <UploadModes />
    </>
  );
}
