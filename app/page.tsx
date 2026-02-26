import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("faculty_seb").select("*");

  console.log("data:", data);
  console.log("error:", error);

  return (
    <main>
      <h1>CLARO</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {error && <p style={{ color: "red" }}>{error.message}</p>}
    </main>
  );
}
