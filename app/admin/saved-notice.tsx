"use client";

import { useEffect, useState } from "react";

// Short confirmation after a save. The message comes from the ?saved= query on the overview;
// it is removed from the address bar so a reload does not show it again.
export function SavedNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
    const id = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(id);
  }, []);

  if (!visible) return null;
  return (
    <div className="saved-notice" role="status">
      <span aria-hidden="true">✓</span> {message}
    </div>
  );
}
