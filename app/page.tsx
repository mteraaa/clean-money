import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("faculty_seb").select("*");

  console.log("data:", data);
  console.log("error:", error);

  return (
    <main className="flex h-screen bg-[#FAFAFA]">
      <div className="w-1/2 flex flex-col items-center justify-center">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-120 h-50 object-contain mb-8"
        />
      </div>
      <div className="w-1/2 flex items-center justify-center">
        
      </div>
      <div>

      </div>
    </main>
  );
}
