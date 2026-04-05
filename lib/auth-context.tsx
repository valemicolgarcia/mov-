"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  display_name: string;
  role: "professor" | "student";
  professor_id?: string;
  share_code?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const profileLoadSeq = useRef(0);

  const buildFallbackProfile = useCallback(
    (userId: string, u: User | null): UserProfile => {
      const metaPid = u?.user_metadata?.professor_id;
      return {
        id: userId,
        display_name:
          (u?.user_metadata?.display_name as string) ??
          u?.email?.split("@")[0] ??
          "Usuario",
        role: (u?.user_metadata?.role as "professor" | "student") ?? "student",
        professor_id:
          typeof metaPid === "string" && metaPid.length > 0
            ? metaPid
            : undefined,
      };
    },
    []
  );

  const loadProfile = useCallback(
    async (userId: string, sessionUser?: User | null) => {
      const seq = ++profileLoadSeq.current;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, role, professor_id, share_code")
          .eq("id", userId)
          .maybeSingle();

        if (seq !== profileLoadSeq.current) return;

        if (data) {
          const rawRole = (data.role ?? "").toString().trim().toLowerCase();
          setProfile({
            ...data,
            role: rawRole === "professor" ? "professor" : "student",
          } as UserProfile);
          return;
        }

        if (error) {
          console.error("[auth] profiles load:", error.message);
        }

        const u =
          sessionUser ??
          (await supabase.auth.getUser()).data.user;
        if (seq !== profileLoadSeq.current) return;
        if (u?.id === userId) {
          setProfile(buildFallbackProfile(userId, u));
        }
      } catch (e) {
        console.error("[auth] loadProfile:", e);
        if (seq !== profileLoadSeq.current) return;
        try {
          const {
            data: { user: u },
          } = await supabase.auth.getUser();
          if (u?.id === userId) {
            setProfile(buildFallbackProfile(userId, u));
          }
        } catch {
          /* ignore */
        }
      }
    },
    [supabase, buildFallbackProfile]
  );

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (u) await loadProfile(u.id, u);
  }, [supabase, loadProfile]);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: Session | null) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        try {
          await loadProfile(u.id, u);
        } catch (e) {
          console.error("[auth] loadProfile:", e);
        }
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[auth] getSession:", error.message);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        return applySession(session);
      })
      .catch((e) => {
        console.error("[auth] getSession failed:", e);
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      void applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
