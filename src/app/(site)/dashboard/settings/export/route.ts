import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";

/** "Download my data": everything we hold about the signed-in customer, as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const rl = await rateLimit("export", user.id);
  if (!rl.ok) return NextResponse.json({ error: "Too many downloads. Try again later." }, { status: 429 });
  const supabase = (await createSupabaseServerClient())!;
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
