import { promises as fs } from "node:fs";
import path from "node:path";
import { put, del } from "@vercel/blob";
import { getEnv } from "@/lib/env";

/**
 * Storage abstraction so raw document bytes never live in Postgres and the
 * implementation can be swapped for S3 / Vercel Blob / Supabase Storage
 * later without touching call sites.
 *
 * `save` returns the canonical reference to persist as `documents.storageKey`
 * — for local storage that's just the key, for Blob it's the public URL
 * `put()` returns. Callers pass that same reference back into `read`/`delete`.
 */
export interface StorageProvider {
  /** Persist a file, returning the reference to store and pass back into read/delete (never a client-controlled path). */
  save(key: string, data: Buffer): Promise<string>;
  read(ref: string): Promise<Buffer>;
  delete(ref: string): Promise<void>;
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

  async save(key: string, data: Buffer): Promise<string> {
    const filePath = this.resolve(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return key;
  }

  async read(ref: string): Promise<Buffer> {
    return fs.readFile(this.resolve(ref));
  }

  async delete(ref: string): Promise<void> {
    await fs.rm(this.resolve(ref), { force: true });
  }
}

/**
 * Vercel Blob-backed storage — used in production (serverless has no
 * persistent filesystem). Enable with STORAGE_DRIVER=blob; Vercel injects
 * BLOB_READ_WRITE_TOKEN automatically once a Blob store is connected.
 */
class BlobStorageProvider implements StorageProvider {
  private token: string | undefined;

  constructor(token: string | undefined) {
    this.token = token;
  }

  async save(key: string, data: Buffer): Promise<string> {
    const { url } = await put(key, data, {
      access: "public",
      addRandomSuffix: false,
      token: this.token,
    });
    return url;
  }

  async read(ref: string): Promise<Buffer> {
    const res = await fetch(ref);
    if (!res.ok) {
      throw new Error(`Failed to read blob at ${ref}: ${res.status} ${res.statusText}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(ref: string): Promise<void> {
    await del(ref, { token: this.token });
  }
}

let provider: StorageProvider | null = null;

/** Returns the active storage provider (local filesystem by default; Vercel Blob when STORAGE_DRIVER=blob). */
export function getStorage(): StorageProvider {
  if (!provider) {
    const { STORAGE_DRIVER, BLOB_READ_WRITE_TOKEN, STORAGE_DIR } = getEnv();
    provider =
      STORAGE_DRIVER === "blob"
        ? new BlobStorageProvider(BLOB_READ_WRITE_TOKEN)
        : new LocalStorageProvider(path.resolve(STORAGE_DIR));
  }
  return provider;
}

/** Generates a collision-resistant storage key scoped to a document. */
export function makeStorageKey(documentId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${documentId}/${safeName}`;
}
