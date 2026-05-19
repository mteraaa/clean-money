"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { useLoginCard } from "./useLoginCard";

function CardLogo() {
  return (
    <>
      <img src="/logo.png" alt="Logo" className="w-max h-16 mx-auto mb-4" />
    </>
  );
}

export default function LoginCard() {
  const {
    identifier, setIdentifier,
    resetEmail, setResetEmail,
    password, setPassword,
    error, success, loading, forgotMode,
    handleSubmit, handleForgotPassword,
    enterForgotMode, exitForgotMode,
  } = useLoginCard();

  if (forgotMode) {
    return (
      <Card className="w-full max-w-sm mx-auto shadow-[0px_4px_10px_rgba(74,85,104,0.3)]">
        <CardHeader>
          <CardLogo />
          <CardTitle className="font-lexend text-center text-2xl font-bold">
            Forgot Password
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleForgotPassword}>
          <CardContent>
            <Label className="font-inter block mb-4" htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="Email"
              className="font-inter mb-4"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            {error && <p className="font-inter text-sm text-red-600 mt-1">{error}</p>}
            {success && <p className="font-inter text-sm text-green-600 mt-1">{success}</p>}
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2">
            <Button type="submit" className="w-full font-inter" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <Button variant="link" className="font-inter text-sm text-red-600" type="button" onClick={exitForgotMode}>
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
        <CardLogo />
        <CardTitle className="font-lexend text-center text-2xl font-bold">Login</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Label className="font-inter block mb-4" htmlFor="identifier">Username / Email</Label>
          <Input
            id="identifier"
            type="text"
            placeholder="Username or Email"
            className="font-inter mb-4"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <Label className="font-inter block mb-4" htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            className="font-inter mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="font-inter text-sm text-red-600 mt-1">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <Button type="submit" className="w-full font-inter" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
          <Button variant="link" className="font-inter text-sm text-red-600" type="button" onClick={enterForgotMode}>
            Forgot Password?
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
