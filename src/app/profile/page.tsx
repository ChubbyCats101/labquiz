"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { fetchProfile, Profile } from "../lib/api";
import { getClientToken } from "../lib/session";

const loginRedirect = (target: string) => `/login?redirect=${encodeURIComponent(target)}`;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getClientToken();
    if (!token) {
      setError("กำลังพาไปหน้าลงชื่อเข้าใช้...");
      router.replace(loginRedirect("/profile"));
      return;
    }

    const run = async () => {
      try {
        const data = await fetchProfile(token);
        setProfile(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "ไม่สามารถโหลดโปรไฟล์ได้";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [router]);

  const derived = useMemo(() => {
    if (!profile) {
      return {
        education: undefined,
        school: undefined,
        advisor: undefined,
        createdAt: undefined as Date | undefined,
        updatedAt: undefined as Date | undefined,
      };
    }

    const createdAt = profile.createdAt ? new Date(profile.createdAt) : undefined;
    const updatedAt = profile.updatedAt ? new Date(profile.updatedAt) : undefined;

    return {
      education: profile.education,
      school: profile.education?.school,
      advisor: profile.education?.advisor,
      createdAt,
      updatedAt,
    };
  }, [profile]);

  const content = (() => {
    if (loading) {
      return <p className={styles.message}>กำลังโหลดโปรไฟล์...</p>;
    }

    if (error) {
      return <p className={`${styles.message} ${styles.error}`}>{error}</p>;
    }

    if (!profile) {
      return <p className={styles.message}>ไม่พบข้อมูลโปรไฟล์</p>;
    }

    const { education, school, advisor, createdAt, updatedAt } = derived;

    return (
      <div className={styles.card}>
        <header className={styles.header}>
          <img
            src={profile.image || education?.image || "https://placehold.co/120x120?text=Profile"}
            alt={`${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim() || "Profile picture"}
            className={styles.avatar}
            width={120}
            height={120}
          />
          <div>
            <h1>
              {[profile.firstname, profile.lastname].filter(Boolean).join(" ") || "Unnamed"}
            </h1>
            <p>{profile.email ?? "ยังไม่มีอีเมล"}</p>
            {profile.role ? <span className={styles.badge}>{profile.role}</span> : null}
          </div>
        </header>

        <section className={styles.section}>
          <h2>Academic Information</h2>
          <dl>
            <div>
              <dt>Program</dt>
              <dd>{education?.major ?? "-"}</dd>
            </div>
            <div>
              <dt>Enrollment Year</dt>
              <dd>{education?.enrollmentYear ?? "-"}</dd>
            </div>
            <div>
              <dt>Student ID</dt>
              <dd>{education?.studentId ?? "-"}</dd>
            </div>
            <div>
              <dt>Study Type</dt>
              <dd>{profile.type ?? "-"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {profile.confirmed === false
                  ? "รอการยืนยัน"
                  : profile.confirmed
                  ? "ยืนยันแล้ว"
                  : "ไม่ทราบสถานะ"}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.section}>
          <h2>School</h2>
          <div className={styles.school}>
            <img
              src={school?.logo || "https://placehold.co/64x64?text=Logo"}
              alt={school?.name ? `${school.name} logo` : "School logo"}
              width={64}
              height={64}
            />
            <div>
              <p className={styles.schoolName}>{school?.name ?? "ยังไม่ระบุ"}</p>
              <p className={styles.schoolMeta}>{school?.province ?? "-"}</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Advisor</h2>
          <div className={styles.advisor}>
            <img
              src={advisor?.image || "https://placehold.co/64x64?text=Advisor"}
              alt={advisor?.name ?? "Advisor"}
              width={64}
              height={64}
            />
            <div>
              <p>{advisor?.name ?? "ยังไม่มีการกำหนดอาจารย์ที่ปรึกษา"}</p>
              <p className={styles.schoolMeta}>{advisor?.email ?? "-"}</p>
            </div>
          </div>
        </section>

        <footer className={styles.metaFooter}>
          <p>สร้างโปรไฟล์เมื่อ: {createdAt ? createdAt.toLocaleString() : "-"}</p>
          <p>อัปเดตล่าสุด: {updatedAt ? updatedAt.toLocaleString() : "-"}</p>
        </footer>
      </div>
    );
  })();

  return <div className={styles.wrapper}>{content}</div>;
}
