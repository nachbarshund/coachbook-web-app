import type { Metadata } from "next";
import { UploadAnalysis } from "./upload-analysis";

export const metadata: Metadata = {
  title: "Hochladen",
};

export default function UploadPage() {
  return (
    <>
      <header className="admin__head">
        <div>
          <div className="eyebrow">Analyse</div>
          <div className="admin__title">Video hochladen</div>
        </div>
      </header>

      <UploadAnalysis />
    </>
  );
}
