import { supabase } from "@/lib/supabase/client";

const SESSION_ACTIVITY_KEY = "take-the-test:last-activity-at";

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_ACTIVITY_KEY);
  }

  if (error) {
    throw error;
  }
}
