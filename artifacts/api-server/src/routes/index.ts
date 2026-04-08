import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hederaRouter from "./hedera";
import ariaRouter from "./aria";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hederaRouter);
router.use(ariaRouter);

export default router;
