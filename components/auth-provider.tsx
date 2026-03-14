"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { ensureUserProfile } from "@/lib/queries/users";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
});

const SESSION_TIMEOUT_MS = 60 * 60 * 1000;
const SESSION_ACTIVITY_KEY = "take-the-test:last-activity-at";

function readLastActivity() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_ACTIVITY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeLastActivity(timestamp = Date.now()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_ACTIVITY_KEY, String(timestamp));
}

function clearLastActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_ACTIVITY_KEY);
}

function isExpired(lastActivity: number | null, now = Date.now()) {
  if (!lastActivity) return false;
  return now - lastActivity > SESSION_TIMEOUT_MS;
}

async function expireSession() {
  clearLastActivity();
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Failed to sign out expired session", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session && isExpired(readLastActivity())) {
          setSession(null);
          setLoading(false);
          void expireSession();
          return;
        }
        if (data.session?.user) {
          try {
            await ensureUserProfile(data.session.user);
          } catch (error) {
            console.error("Failed to sync user profile", error);
          }
          if (!readLastActivity()) writeLastActivity();
        }
        if (!mounted) return;
        setSession(data.session);
      } catch (error) {
        console.error("Failed to restore auth session", error);
        if (!mounted) return;
        setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        clearLastActivity();
        setSession(null);
        setLoading(false);
        return;
      }

      if (nextSession && isExpired(readLastActivity())) {
        setSession(null);
        setLoading(false);
        void expireSession();
        return;
      }

      if (nextSession?.user) {
        void ensureUserProfile(nextSession.user).catch((error) => {
          console.error("Failed to sync user profile", error);
        });
        if (event === "SIGNED_IN") writeLastActivity();
      }

      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !pathname) return;
    writeLastActivity();
  }, [pathname, session]);

  useEffect(() => {
    if (!session) return;

    const timer = window.setInterval(async () => {
      if (!isExpired(readLastActivity())) return;
      await supabase.auth.signOut();
      clearLastActivity();
      setSession(null);
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, [session]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
