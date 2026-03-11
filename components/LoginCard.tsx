"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function LoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleForgotPassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Check your email for a password reset link.");
    }
  }

  if (forgotMode) {
    return (
      <Card className="w-full max-w-sm mx-auto shadow-[0px_4px_10px_rgba(74,85,104,0.3)]">
        <CardHeader>
          <img src="/logo.png" alt="Logo" className="w-max h-16 mx-auto mb-4" />
          <CardTitle className="font-lexend text-center text-2xl font-bold">
            Forgot Password
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleForgotPassword}>
          <CardContent>
            <Label className="font-inter block mb-4" htmlFor="reset-email">
              Email
            </Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="Email"
              className="font-inter mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && (
              <p className="font-inter text-sm text-red-600 mt-1">{error}</p>
            )}
            {success && (
              <p className="font-inter text-sm text-green-600 mt-1">{success}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2">
            <Button type="submit" className="w-full font-inter" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <Button
              variant="link"
              className="font-inter text-sm text-red-600"
              type="button"
              onClick={() => { setForgotMode(false); setError(null); setSuccess(null); }}
            >
              Back to Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm mx-auto shadow-[0px_4px_10px_rgba(74,85,104,0.3)]">
      <CardHeader>
        <img src="/logo.png" alt="Logo" className="w-max h-16 mx-auto mb-4" />
        <CardTitle className="font-lexend text-center text-2xl font-bold">
          Login
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Label className="font-inter block mb-4" htmlFor="email">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            className="font-inter mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Label className="font-inter block mb-4" htmlFor="password">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            className="font-inter mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p className="font-inter text-sm text-red-600 mt-1">{error}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <Button type="submit" className="w-full font-inter" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
          <Button
            variant="link"
            className="font-inter text-sm text-red-600"
            type="button"
            onClick={() => { setForgotMode(true); setError(null); setSuccess(null); }}
          >
            Forgot Password?
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
