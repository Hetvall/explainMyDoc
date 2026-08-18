import { promises as fs } from "node:fs";
import path from "node:path";
import { getEnv } from "@/lib/env";

/**
 * Storage abstraction so raw document bytes never live in Postgres and the
 * implementation can be swapped for S3 / Vercel Blob / Supabase Storage
 * later without touching call sites.
 */
export interface StorageProvider {
  /** Persist a file, returning an opaque storage key (never a client-controlled path). */
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private root: string;

  constructor(root: string) {
    this.root = root;
  }

  private resolve(key: string): string {
    // Defend against path traversal from any key that originates outside
    // this module (defense in depth — keys are always server-generated).
    const safeKey = key.replace(/\.\./g, "").replace(/^[/\\]+/, "");
    return path.join(this.root, safeKey);
  }

  async save(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolve(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }
}

let provider: StorageProvider | null = null;

/** Returns the active storage provider (local filesystem for the MVP). */
export function getStorage(): StorageProvider {
  if (!provider) {
    provider = new LocalStorageProvider(path.resolve(getEnv().STORAGE_DIR));
  }
  return provider;
}

/** Generates a collision-resistant storage key scoped to a document. */
export function makeStorageKey(documentId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${documentId}/${safeName}`;
}
