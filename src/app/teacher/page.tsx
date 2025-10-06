"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Teacher, fetchTeachers } from "../lib/api";
import { getClientToken } from "../lib/session";

const redirectTarget = "/teacher";
const loginRedirect = (target: string) => `/login?redirect=${encodeURIComponent(target)}`;

export default function TeacherPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
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
        const data = await fetchTeachers(token);
        setTeachers(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลอาจารย์ได้";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Teacher Directory</h1>
        <p>ทำความรู้จักคณาจารย์และอาจารย์ที่ปรึกษาที่ร่วมดูแลการเรียนของคุณ</p>
      </header>

      {error ? (
        <p className={`${styles.message} ${styles.error}`} aria-live="polite">
          {error}
        </p>
      ) : null}

      {loading ? <p className={styles.message}>กำลังโหลดรายชื่ออาจารย์...</p> : null}

      {!loading && !error ? (
        <section className={styles.grid}>
          {teachers.map((teacher) => (
            <article key={teacher._id} className={styles.card}>
              <div className={styles.avatarWrapper}>
                <span className={styles.badge}>#{teacher.no}</span>
                <img
                  src={teacher.image || "https://placehold.co/96x96?text=Teacher"}
                  alt={teacher.name}
                  width={96}
                  height={96}
                />
              </div>
              <div className={styles.body}>
                <h2>{teacher.name}</h2>
                <p className={styles.meta}>{teacher.email}</p>
                <footer className={styles.cardFooter}>
                  <span>เข้าร่วม: {new Date(teacher.createdAt).toLocaleDateString()}</span>
                  <span>อัปเดตล่าสุด: {new Date(teacher.updatedAt).toLocaleDateString()}</span>
                </footer>
              </div>
            </article>
          ))}
          {teachers.length === 0 && !loading ? (
            <p className={styles.empty}>ยังไม่มีข้อมูลอาจารย์</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
