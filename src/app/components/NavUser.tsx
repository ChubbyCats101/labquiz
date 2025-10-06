"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clearClientSession, getClientToken } from "../lib/session";

type ProfileSummary = {
  firstname?: string;
  lastname?: string;
  email?: string;
  image?: string;
};

function readProfile(): ProfileSummary | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("classroomProfile");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfileSummary;
  } catch (error) {
    console.warn("Failed to parse classroomProfile from localStorage", error);
    return null;
  }
}

export default function NavUser() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refreshSession = useCallback(() => {
    if (typeof window === "undefined") return;
    setToken(getClientToken());
    setProfile(readProfile());
    setInitialized(true);
  }, []);

  useEffect(() => {
    refreshSession();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && !event.key.startsWith("classroom")) return;
      refreshSession();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshSession);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshSession);
    };
  }, [refreshSession]);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/session", { method: "DELETE" });
    } catch (error) {
      console.warn("Failed to clear session cookie", error);
    }

    clearClientSession();
    refreshSession();
    router.push("/login");
  }, [refreshSession, router]);

  const displayName = useMemo(() => {
    if (!profile) return null;
    const name = [profile.firstname, profile.lastname].filter(Boolean).join(" ");
    return name || profile.email || null;
  }, [profile]);

  const initials = useMemo(() => {
    if (!profile) return "";
    const letters = [profile.firstname, profile.lastname]
      .filter(Boolean)
      .map((value) => (value ? value.charAt(0).toUpperCase() : ""))
      .join("");
    if (letters) return letters.slice(0, 2);
    if (profile.email) return profile.email.charAt(0).toUpperCase();
    return "";
  }, [profile]);

  if (!initialized) {
    return <div className="site-user" aria-hidden="true" />;
  }

  if (!token) {
    return (
      <div className="site-user">
        <Link href="/login" className="site-user__signin">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="site-user">
      {profile?.image ? (
        <img src={profile.image} alt={displayName ?? "Profile avatar"} className="site-user__avatar" />
      ) : (
        <span className="site-user__avatar site-user__avatar--fallback">{initials}</span>
      )}
      <span className="site-user__name">{displayName ?? "Signed in"}</span>
      <button type="button" className="site-user__signout" onClick={handleSignOut}>
        Sign Out
      </button>
    </div>
  );
}
