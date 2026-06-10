"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";

type Stage = "exchanging" | "ready" | "invalid";

export default function ResetPasswordCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>("exchanging");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStage("invalid");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStage("invalid");
      } else {
        setStage("ready");
      }
    });
  }, [searchParams]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      await supabase.auth.signOut();
      router.push("/login");
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto shadow-[0px_4px_10px_rgba(74,85,104,0.3)]">
      <CardHeader>
        <img src="/logo.png" alt="Logo" className="w-max h-16 mx-auto mb-4" />
        <CardTitle className="font-lexend text-center text-2xl font-bold">
          Reset Password
        </CardTitle>
      </CardHeader>

      {stage === "exchanging" && (
        <CardContent>
          <p className="font-inter text-sm text-center text-gray-500">
            Verifying reset link...
          </p>
        </CardContent>
      )}

      {stage === "invalid" && (
        <>
          <CardContent>
            <p className="font-inter text-sm text-center text-red-600">
              This reset link is invalid or has expired. Please request a new one.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="link"
              className="font-inter text-sm text-red-600"
              onClick={() => router.push("/login")}
            >
              Back to Login
            </Button>
          </CardFooter>
        </>
      )}

      {stage === "ready" && (
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Label className="font-inter block mb-4" htmlFor="new-password">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="New Password"
              className="font-inter mb-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Label className="font-inter block mb-4" htmlFor="confirm-password">
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm Password"
              className="font-inter mb-4"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && (
              <p className="font-inter text-sm text-red-600 mt-1">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2">
            <Button
              type="submit"
              className="w-full font-inter"
              disabled={loading}
            >
              {loading ? "Updating..." : "Reset Password"}
            </Button>
            <Button
              variant="link"
              className="font-inter text-sm text-red-600"
              type="button"
              onClick={() => router.push("/login")}
            >
              Back to Login
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
