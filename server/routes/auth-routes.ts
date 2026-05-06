import { Router } from "express";
import { AuthController } from "../controllers/auth-controller.ts";
import { authMiddleware } from "../middleware/auth-middleware.ts";

const router = Router();
const authController = new AuthController();

// POST /api/auth/register
router.post("/register", (req, res) => authController.register(req, res));

// POST /api/auth/login
router.post("/login", (req, res) => authController.login(req, res));

// GET /api/auth/verify
router.get("/verify", authMiddleware, (req, res) =>
  authController.verify(req, res),
);

export default router;
