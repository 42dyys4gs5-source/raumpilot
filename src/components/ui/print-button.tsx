"use client";

import { Printer } from "lucide-react";
import { Button } from "./button";

export function PrintButton() {
  return <Button variant="secondary" onClick={() => window.print()}><Printer /> Drucken / als PDF speichern</Button>;
}
