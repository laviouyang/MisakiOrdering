import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { logger } from "./logger";

const menuPort = Number(process.env["MISAKI_MENU_INTERNAL_PORT"] ?? "8765");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const menuServerPath = resolve(
  projectRoot,
  "artifacts/misaki-ordering/python_server/main.py",
);

export async function startPythonMenuService() {
  const child = spawn("python3", [menuServerPath], {
    env: {
      PATH: process.env["PATH"] ?? "",
      PYTHONUNBUFFERED: "1",
      MISAKI_MENU_PORT: String(menuPort),
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  let spawnError: Error | null = null;
  child.once("error", (err) => {
    spawnError = err;
    logger.error({ err }, "Could not start the Python menu service");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const output = chunk.toString().trim();
    if (output) logger.info({ output }, "Python menu service");
  });
  child.once("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      logger.error({ code, signal }, "Python menu service exited unexpectedly");
    }
  });

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (spawnError) {
      child.kill("SIGTERM");
      throw spawnError;
    }
    if (child.exitCode !== null) {
      throw new Error(
        `Python menu service exited before becoming ready (code ${child.exitCode}).`,
      );
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${menuPort}/healthz`,
        { signal: AbortSignal.timeout(300) },
      );
      if (response.ok) {
        logger.info({ port: menuPort }, "Python menu service is ready");
        return child;
      }
    } catch {
      // The service may need a moment to load its menu and bind the port.
    }
    await delay(100);
  }

  child.kill("SIGTERM");
  throw new Error("Python menu service did not become ready within 10 seconds.");
}