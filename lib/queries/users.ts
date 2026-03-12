import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export async function ensureUserProfile(user: User): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}
