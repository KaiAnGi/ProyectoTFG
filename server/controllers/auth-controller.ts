import type { Request, Response } from "express";
import { AuthService } from "../services/auth-service.ts";
import User from "../models/User.ts";
import { AuthenticatedRequest } from "../middleware/auth-middleware.ts";

const authService = new AuthService();

export class AuthController {
  // Registro de usuario
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, confirmPassword } = req.body;

      // Validar que todos los campos estén presentes
      if (!username || !email || !password || !confirmPassword) {
        res.status(400).json({
          success: false,
          error: "Todos los campos son obligatorios",
        });
        return;
      }

      const result = await authService.register({
        username,
        email,
        password,
        confirmPassword,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al registrar usuario",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  // Login de usuario
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validar que todos los campos estén presentes
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: "El correo y la contraseña son obligatorios",
        });
        return;
      }

      const result = await authService.login({
        email,
        password,
      });

      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al iniciar sesión",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async verify(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userPayload = req.user;
      if (!userPayload || !userPayload.username) {
        res.status(401).json({ success: false, error: "Token inválido" });
        return;
      }

      const user = await User.findOne({ username: userPayload.username });
      if (!user) {
        res
          .status(404)
          .json({ success: false, error: "Usuario no encontrado" });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          bones: user.bones ?? 25,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error verificando sesión",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
