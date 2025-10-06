"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { getClientToken } from "./lib/session";

const navItems = [
  {
    href: "/profile",
    title: "Profile",
    description: "ดูข้อมูลประวัตินักศึกษา ข้อมูลสาขา อาจารย์ที่ปรึกษา และรายละเอียดโรงเรียน",
  },
  {
    href: "/company",
    title: "Companies",
    description: "สำรวจบริษัทหรือองค์กรที่เป็นพันธมิตรกับโปรแกรมนี้",
  },
  {
    href: "/school",
    title: "School",
    description: "ดูข้อมูลคณะหรือโรงเรียน เช่น จังหวัดที่ตั้งและโลโก้อย่างเป็นทางการ",
  },
  {
    href: "/teacher",
    title: "Teachers",
    description: "รู้จักกับคณาจารย์และอาจารย์ที่ปรึกษาที่ดูแลการเรียนของคุณ",
  },
  {
    href: "/classmates",
    title: "Classmates",
    description: "ดูรายชื่อเพื่อนร่วมรุ่นพร้อมรายละเอียดของสาขาและผู้ดูแล",
  },
  {
    href: "/statuses",
    title: "Status Board",
    description: "โพสต์อัปเดต แสดงความคิดเห็น และมีปฏิสัมพันธ์กับเพื่อนร่วมชั้น",
  },
];

const authItem = {
    href: "/login",
    title: "Sign In",
    description: "ลงชื่อเข้าใช้เพื่อปลดล็อกฟีเจอร์และรับโทเคนสำหรับเรียกใช้งาน API",
};

export default function Home() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(Boolean(getClientToken()));
  }, []);

  const items = hasToken ? navItems : [authItem, ...navItems];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.badge}>KKU Classroom Toolkit</span>
        <h1>Welcome</h1>
        <p>
          พื้นที่เริ่มต้นสำหรับเชื่อมต่อกับ API ของ Classroom เริ่มจากการลงชื่อเข้าใช้ จากนั้นสำรวจโปรไฟล์
          เครือข่ายพันธมิตร โรงเรียน อาจารย์ เพื่อนร่วมรุ่น และบอร์ดสถานะร่วมกันได้เลย
        </p>
      </header>

      <main className={styles.main}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={styles.card}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <span aria-hidden className={styles.arrow}>&rarr;</span>
          </Link>
        ))}
      </main>

      <footer className={styles.footer}>
        <small>คำแนะนำ: ลงชื่อเข้าใช้ก่อนเพื่อรับโทเคนสำหรับใช้งาน API ในหน้าต่างๆ</small>
      </footer>
    </div>
  );
}
