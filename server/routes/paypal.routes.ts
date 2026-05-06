import { Router } from "express";
import { PaypalController } from "../controllers/paypal.controller.ts";

const router = Router();

router.post("/create-order", PaypalController.createOrder);
router.post("/capture-order", PaypalController.captureOrder);
router.get("/check-order/:orderID", PaypalController.checkOrder); // ← nuevo

export default router;