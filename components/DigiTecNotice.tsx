import Link from "@/components/SiteLink";
import Image from "next/image";
import styles from "./DigiTecNotice.module.css";
export default function DigiTecNotice() {
  return <aside className={styles.notice} aria-label="DigiTec 2026 exhibition">
    <div className={styles.identity}><Image src="/images/digitec2026/digitec-logo.webp" alt="DigiTec" width={28} height={44} /><div><strong>Meet us at DigiTec 2026</strong><span>November 20–22 · Yerevan</span></div></div>
    <p>Explore the products we’re building.</p>
    <Link href="/digitec2026">Explore the showcase <span aria-hidden="true">↗</span></Link>
  </aside>;
}
