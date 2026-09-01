import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { SQLiteConnection, CapacitorSQLite } from "@capacitor-community/sqlite";
import type { LocalState } from "./data";
import { createInitialState, normalizeState } from "./data";

const stateKey = "myos-offline-state";
const passphraseKey = "myos-offline-db-passphrase";
const sqlite = new SQLiteConnection(CapacitorSQLite);

export type StorageBackend = "sqlite" | "preferences";

let backend: StorageBackend = "preferences";
let lastError = "";

export function getStorageStatus() {
  return { backend, lastError };
}

async function ensurePassphrase() {
  const existing = await Preferences.get({ key: passphraseKey });
  if (existing.value) return existing.value;
  const secret = crypto.randomUUID();
  await Preferences.set({ key: passphraseKey, value: secret });
  return secret;
}

async function openEncryptedDatabase() {
  const passphrase = await ensurePassphrase();
  const stored = await sqlite.isSecretStored();
  if (!stored.result) {
    await sqlite.setEncryptionSecret(passphrase);
  }
  const db = await sqlite.createConnection("myos_offline", true, "secret", 1, false);
  await db.open();
  await db.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)");
  return db;
}

async function preferencesLoad() {
  const { value } = await Preferences.get({ key: stateKey });
  return value ? normalizeState(JSON.parse(value) as Partial<LocalState>) : createInitialState();
}

export async function loadLocalState(): Promise<LocalState> {
  if (!Capacitor.isNativePlatform()) {
    backend = "preferences";
    lastError = "";
    return preferencesLoad();
  }
  try {
    const db = await openEncryptedDatabase();
    const result = await db.query("SELECT value FROM kv WHERE key = ?", [stateKey]);
    await db.close();
    backend = "sqlite";
    lastError = "";
    return result.values?.[0]?.value ? normalizeState(JSON.parse(String(result.values[0].value)) as Partial<LocalState>) : createInitialState();
  } catch (error) {
    backend = "preferences";
    lastError = error instanceof Error ? error.message : "SQLite 不可用，已回退 Preferences。";
    return preferencesLoad();
  }
}

export async function saveLocalState(state: LocalState) {
  const serialized = JSON.stringify(state);
  if (!Capacitor.isNativePlatform()) {
    backend = "preferences";
    await Preferences.set({ key: stateKey, value: serialized });
    return;
  }
  try {
    const db = await openEncryptedDatabase();
    await db.run("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [stateKey, serialized]);
    await db.close();
    backend = "sqlite";
    lastError = "";
  } catch (error) {
    backend = "preferences";
    lastError = error instanceof Error ? error.message : "SQLite 写入失败，已回退 Preferences。";
    await Preferences.set({ key: stateKey, value: serialized });
  }
}
