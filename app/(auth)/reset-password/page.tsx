import { Suspense } from "react";
import ResetPasswordCard from "@/components/auth/ResetPasswordCard";

export default function ResetPasswordPage() {
  return (
    <main className="flex items-center justify-center min-h-screen animate-fade-in-up">
      <Suspense>
        <ResetPasswordCard />
      </Suspense>
    </main>
  );
}
