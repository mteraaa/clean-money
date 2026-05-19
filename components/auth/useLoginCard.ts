"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function useLoginCard() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [resetEmail, setResetEmail] = useState("");
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
    let loginEmail = identifier;

    if (!identifier.includes("@")) {
      const { data: email, error: lookupError } = await supabase
        .rpc("get_email_by_username", { p_username: identifier });

      if (lookupError || !email) {
        setError("No account found with that username.");
        setLoading(false);
        return;
      }

      loginEmail = email;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);

    if (error) setError(error.message);
    else router.push("/dashboard");
  }

  async function handleForgotPassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) setError(error.message);
    else setSuccess("Check your email for a password reset link.");
  }

  function enterForgotMode() {
    setForgotMode(true);
    setError(null);
    setSuccess(null);
  }

  function exitForgotMode() {
    setForgotMode(false);
    setError(null);
    setSuccess(null);
  }

  return {
    identifier, setIdentifier,
    resetEmail, setResetEmail,
    password, setPassword,
    error, success, loading, forgotMode,
    handleSubmit, handleForgotPassword,
    enterForgotMode, exitForgotMode,
  };
}
