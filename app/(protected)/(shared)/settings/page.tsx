"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import UsernameCard from "@/components/settings/UsernameCard";
import EmailCard from "@/components/settings/EmailCard";
import PasswordCard from "@/components/settings/PasswordCard";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserEmail(user.email ?? "");
      setUserId(user.id);
    });
  }, []);

  return (
    <div className="bg-[#f3f4f6] h-full p-8 font-lexend">
      <div className="grid grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4">
          <UsernameCard userId={userId} userEmail={userEmail} />
          <EmailCard userEmail={userEmail} />
        </div>
        <PasswordCard userEmail={userEmail} />
      </div>
    </div>
  );
}
