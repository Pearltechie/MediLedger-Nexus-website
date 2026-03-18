import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hederaRouter from "./hedera";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hederaRouter);

export default router;
