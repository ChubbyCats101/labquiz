"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Company, fetchCompanies } from "../lib/api";
import { getClientToken } from "../lib/session";

const redirectTarget = "/company";
const loginRedirect = (target: string) => `/login?redirect=${encodeURIComponent(target)}`;

export default function CompanyPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
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
        const data = await fetchCompanies(token);
        setCompanies(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "ไม่สามารถโหลดรายชื่อบริษัทได้";
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
        <h1>Partner Companies</h1>
        <p>รวมองค์กรและบริษัทพันธมิตรที่ร่วมมือกับโปรแกรม Classroom</p>
      </header>

      {error ? (
        <p className={`${styles.message} ${styles.error}`} aria-live="polite">
          {error}
        </p>
      ) : null}

      {loading ? <p className={styles.message}>กำลังโหลดรายชื่อบริษัท...</p> : null}

      {!loading && !error ? (
        <section className={styles.grid}>
          {companies.map((company) => (
            <article key={company._id} className={styles.card}>
              <img
                src={company.logo || "https://placehold.co/96x96?text=Logo"}
                alt={`${company.name} logo`}
                className={styles.logo}
                width={96}
                height={96}
              />
              <div className={styles.cardBody}>
                <h2>{company.name}</h2>
                <p className={styles.meta}>{company.province || "-"}</p>
              </div>
              <footer className={styles.cardFooter}>
                <span>เข้าร่วม: {new Date(company.createdAt).toLocaleDateString()}</span>
                <span>อัปเดตล่าสุด: {new Date(company.updatedAt).toLocaleDateString()}</span>
              </footer>
            </article>
          ))}
          {companies.length === 0 && !loading ? (
            <p className={styles.empty}>ยังไม่มีข้อมูลบริษัท</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
