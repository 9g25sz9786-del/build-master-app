"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button className="btn-primary no-print" onClick={() => window.print()}>
      <Printer size={15} /> Print / Save as PDF
    </button>
  );
}
