import { GetMisakiMenuResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";

const router: IRouter = Router();
const pythonMenuPort = Number(
  process.env["MISAKI_MENU_INTERNAL_PORT"] ?? "8765",
);

router.get("/misaki/menu", async (req, res): Promise<void> => {
  try {
    const response = await fetch(
      `http://127.0.0.1:${pythonMenuPort}/menu`,
      { signal: AbortSignal.timeout(5_000) },
    );

    if (!response.ok) {
      req.log.warn(
        { status: response.status },
        "Python menu service returned an unsuccessful response",
      );
      res.status(503).json({ error: "The published menu is temporarily unavailable." });
      return;
    }

    const catalog: unknown = await response.json();
    res.json(GetMisakiMenuResponse.parse(catalog));
  } catch (err) {
    req.log.error({ err }, "Could not read the published menu from Python");
    res.status(503).json({ error: "The published menu is temporarily unavailable." });
  }
});

export default router;