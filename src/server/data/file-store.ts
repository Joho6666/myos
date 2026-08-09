import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { mergeData } from "@/lib/data/merge";
import type { MyOSData } from "@/lib/data/models";
import { seedData } from "@/lib/data/seed";
import { serverDataDir } from "@/server/paths";
import { applyMyOSAction } from "./actions";
import type { MyOSAction } from "./schemas";

const dataDir = serverDataDir;
const dataFile = path.join(dataDir, "myos-data.json");

let writeQueue = Promise.resolve();

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function persistData(data: MyOSData) {
  await ensureDataDir();
  const temporaryFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temporaryFile, dataFile);
}

export async function readMyOSDataFromFile(): Promise<MyOSData> {
  try {
    const raw = await readFile(dataFile, "utf8");
    return mergeData(JSON.parse(raw) as Partial<MyOSData>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to read MyOS local data store", error);
    }
    await persistData(seedData);
    return seedData;
  }
}

export async function applyMyOSActionToFile(action: MyOSAction): Promise<MyOSData> {
  const nextWrite = writeQueue.then(async () => {
    const current = await readMyOSDataFromFile();
    const next = mergeData(applyMyOSAction(current, action));
    await persistData(next);
    return next;
  });

  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined
  );

  return nextWrite;
}

export async function replaceMyOSDataInFile(data: MyOSData): Promise<MyOSData> {
  const nextWrite = writeQueue.then(async () => {
    const next = mergeData(data);
    await persistData(next);
    return next;
  });

  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined
  );

  return nextWrite;
}
