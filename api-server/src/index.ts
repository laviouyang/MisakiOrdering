import app from "./app";
import { logger } from "./lib/logger";
import { startPythonMenuService } from "./lib/python-menu-service";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer(): Promise<void> {
  const pythonMenuService = await startPythonMenuService();
  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  server.on("error", (err) => {
    logger.error({ err }, "Error listening on port");
    pythonMenuService.kill("SIGTERM");
    process.exitCode = 1;
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Stopping API and Python menu services");
    server.close();
    pythonMenuService.kill(signal);
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err: unknown) => {
  logger.fatal({ err }, "Could not start the API server");
  process.exitCode = 1;
});
