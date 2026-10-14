import { Router, type IRouter } from "express";
import healthRouter from "./health";
import misakiRouter from "./misaki";

const router: IRouter = Router();

router.use(healthRouter);
router.use(misakiRouter);

export default router;
