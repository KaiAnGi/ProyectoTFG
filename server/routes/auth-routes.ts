import { Router } from "express";
import { AuthController } from "../controllers/auth-controller.ts";

const router = Router();
const authController = new AuthController();

// POST /api/auth/register
router.post("/register", (req, res) => authController.register(req, res));

export default router;
