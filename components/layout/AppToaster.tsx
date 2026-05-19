"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      duration={5000}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: "font-lexend text-sm",
        },
      }}
    />
  );
}
