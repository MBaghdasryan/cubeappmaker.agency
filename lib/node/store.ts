import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Lead } from "../server.ts";

export class Store {
  readonly db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, hash TEXT NOT NULL, state TEXT NOT NULL, expires INTEGER NOT NULL);`);
  }
  limit(key: string, maximum: number, windowMs: number, now = Date.now()) {
    const expires = (Math.floor(now / windowMs) + 1) * windowMs;
    this.db.prepare("DELETE FROM limits WHERE expires <= ?").run(now);
    const row = this.db.prepare(`INSERT INTO limits VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).get(key, expires) as { count: number };
    return row.count <= maximum;
  }
  reserve(id: string, lead: Lead, now = Date.now()) {
    const hash = createHash("sha256").update(JSON.stringify({ ...lead, timestamp: undefined })).digest("hex");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM leads WHERE expires <= ?").run(now);
      const prior = this.db.prepare("SELECT hash,state FROM leads WHERE id=?").get(id) as {hash:string;state:string}|undefined;
      if (prior) {
        if (prior.hash !== hash) throw Error("IDEMPOTENCY_CONFLICT");
        if (prior.state === "pending") throw Error("IN_PROGRESS");
        this.db.exec("COMMIT");
        return false;
      }
      // Lease exceeds bounded webhook timeout. Receiver must also deduplicate the key for crash recovery.
      this.db.prepare("INSERT INTO leads VALUES (?,?,'pending',?)").run(id, hash, now + 60000);
      this.db.exec("COMMIT");
      return true;
    } catch(error) { this.db.exec("ROLLBACK"); throw error; }
  }
  complete(id: string) { this.db.prepare("UPDATE leads SET state='done',expires=? WHERE id=?").run(Date.now()+30*86400000,id); }
  release(id: string) { this.db.prepare("DELETE FROM leads WHERE id=? AND state='pending'").run(id); }
  ready() { this.db.prepare("SELECT 1").get(); }
}
let singleton: Store | undefined;
export function store() {
  if (!singleton) singleton = new Store(path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "cubeapp.sqlite"));
  return singleton;
}
export function limitValue(name: string, fallback: number) {
  const n=Number(process.env[name]);
  return Number.isSafeInteger(n) && n>0 && n<=100000 ? n : fallback;
}
