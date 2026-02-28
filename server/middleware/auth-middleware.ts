import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    username: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Token no proporcionado",
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret_key_change_me",
    ) as { _id: string; email: string; username: string };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Token inválido o expirado",
    });
  }
};