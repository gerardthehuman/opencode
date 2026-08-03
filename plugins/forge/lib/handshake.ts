import fs, { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { Forge } from "./forge";
import { ForgeNotRunning } from "./errors";

export const HandshakeFile = join(homedir(), ".forge", "cli-handshake.json");
export const HandshakeSchema = z.object({
  version: z.number().int().positive().default(1),
  host: z.string().default("127.0.0.1"),
  port: z.number().int().positive(),
  token: z.string().min(1),
  pid: z.number().int().positive(),
  appPath: z.string().min(1),
  started: z.iso.datetime({ offset: true }),
});

export async function getHandshake() {
  const exists = await access(HandshakeFile, fs.constants.R_OK)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    throw new ForgeNotRunning(`Forge handshake file is missing.`);
  }

  try {
    const contents = await readFile(HandshakeFile, "utf-8");
    const data = JSON.parse(contents);

    return HandshakeSchema.parse(data);
  } catch (error) {
    throw new ForgeNotRunning(`Forge handshake file is malformed. ${(error as Error).message}`);
  }
}

export async function handshake() {
  const handshake = await getHandshake();

  // Validate process is running
  try {
    process.kill(handshake.pid, 0);
  } catch (error) {
    throw new ForgeNotRunning(`Forge process not detected.`);
  }

  // Validate API is reachable
  try {
    const api = new Forge(`http://${handshake.host}:${handshake.port}`, handshake.token);
    const status = await api.ping(); //?

    if (!status.ok || !status.signedIn) {
      throw new Error(`Forge cannot be reached or not signed in.`);
    }

    return api;
  } catch (error) {
    throw new Error(`Forge cannot be reached. ${(error as Error).message}`);
  }
}
