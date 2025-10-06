"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { School, fetchSchool } from "../lib/api";
import { getClientToken } from "../lib/session";

const redirectTarget = "/school";
const loginRedirect = (target: string) => `/login?redirect=${encodeURIComponent(target)}`;

export default function SchoolPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getClientToken();
    if (!stored) {
      setError("กำลังพาไปหน้าลงชื่อเข้าใช้...");
      router.replace(loginRedirect(redirectTarget));
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSchool(token);
        setSchool(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลโรงเรียนได้";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const createdAt = school?.createdAt ? new Date(school.createdAt).toLocaleString() : "-";
  const updatedAt = school?.updatedAt ? new Date(school.updatedAt).toLocaleString() : "-";

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>School Overview</h1>
        <p>ข้อมูลภาพรวมของคณะหรือโรงเรียนที่คุณสังกัดอยู่</p>
      </header>

      {error ? (
        <p className={`${styles.message} ${styles.error}`} aria-live="polite">
          {error}
        </p>
      ) : null}

      {loading ? <p className={styles.message}>กำลังโหลดข้อมูลโรงเรียน...</p> : null}

      {!loading && !error && school ? (
        <article className={styles.card}>
          <img
            src={school.logo || "https://placehold.co/128x128?text=School"}
            alt={`${school.name} logo`}
            className={styles.logo}
            width={128}
            height={128}
          />
          <div className={styles.body}>
            <h2>{school.name}</h2>
            <p className={styles.meta}>{school.province || "-"}</p>
            <dl>
              <div>
                <dt>Created</dt>
                <dd>{createdAt}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{updatedAt}</dd>
              </div>
            </dl>
          </div>
        </article>
      ) : null}
    </div>
  );
}
