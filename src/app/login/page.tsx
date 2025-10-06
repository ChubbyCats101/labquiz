"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { signIn } from "../lib/api";
import { getClientToken } from "../lib/session";

type FormState = {
  email: string;
  password: string;
};

type Status = {
  message: string;
  tone: "idle" | "error" | "success";
};

const initialForm: FormState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") ?? "/";
  const redirectTimer = useRef<NodeJS.Timeout | null>(null);

  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<Status>({ message: "", tone: "idle" });
  const [loading, setLoading] = useState(false);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = getClientToken();
    if (storedToken) {
      setTokenPreview(storedToken);
      setStatus({ message: "คุณได้ลงชื่อเข้าใช้แล้ว กำลังพาไปยังหน้าที่ต้องการ...", tone: "success" });
      redirectTimer.current = setTimeout(() => {
        router.replace(redirectPath);
      }, 900);
    }

    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, [redirectPath, router]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.email || !form.password) {
      setStatus({ message: "กรุณากรอกอีเมลและรหัสผ่านให้ครบ", tone: "error" });
      return;
    }

    try {
      setLoading(true);
      setStatus({ message: "กำลังลงชื่อเข้าใช้...", tone: "idle" });
      const data = await signIn(form);

      window.localStorage.setItem("classroomToken", data.token);
      window.localStorage.setItem("classroomProfile", JSON.stringify(data));
      setTokenPreview(data.token);

      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token }),
      }).catch(() => {
        /* cookie ไม่สำคัญต่อการใช้งานฝั่ง client */
      });

      setForm(initialForm);
      setStatus({ message: "ลงชื่อเข้าใช้สำเร็จ กำลังพาไปยังหน้าถัดไป...", tone: "success" });

      redirectTimer.current = setTimeout(() => {
        router.push(redirectPath);
      }, 800);
    } catch (error) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
      setStatus({ message, tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1>Sign In</h1>
          <p>กรอกอีเมลและรหัสผ่านของระบบ Classroom เพื่อรับโทเคนใช้งาน API</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="password123"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "กำลังลงชื่อเข้าใช้..." : "Sign In"}
          </button>
        </form>

        {status.message ? (
          <p
            className={`${styles.status} ${
              status.tone === "error"
                ? styles.statusError
                : status.tone === "success"
                ? styles.statusSuccess
                : ""
            }`}
            aria-live="polite"
          >
            {status.message}
          </p>
        ) : null}
      </section>

      <aside className={styles.hint}>
        <h2>What happens next?</h2>
        <ol>
          <li>ส่งข้อมูลเข้าสู่ endpoint `/api/classroom/signin`</li>
          <li>ระบบจะบันทึกโทเคนที่ได้รับบนอุปกรณ์นี้อย่างปลอดภัย</li>
          <li>จากนั้นคุณจะถูกพาไปยังหน้าฟังก์ชันอื่นๆ ต่อทันที</li>
        </ol>

        {tokenPreview ? (
          <div className={styles.tokenBox}>
            <p>โทเคนล่าสุดที่พบในเบราว์เซอร์นี้:</p>
            <code>{tokenPreview}</code>
          </div>
        ) : (
          <p className={styles.tokenNote}>ยังไม่มีโทเคนถูกบันทึก</p>
        )}
      </aside>
    </div>
  );
}
