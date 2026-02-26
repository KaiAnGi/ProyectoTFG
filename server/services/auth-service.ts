import User from "../models/User.ts";
import type { IUser } from "../models/User.ts";

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export class AuthService {
  async register(data: RegisterData): Promise<{
    success: boolean;
    user?: Partial<IUser>;
    error?: string;
  }> {
    const { username, email, password, confirmPassword } = data;

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      return {
        success: false,
        error: "Las contraseñas no coinciden",
      };
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      return {
        success: false,
        error: "La contraseña debe tener al menos 6 caracteres",
      };
    }

    // Validar longitud mínima de nombre de usuario
    if (username.length < 3) {
      return {
        success: false,
        error: "El nombre de usuario debe tener al menos 3 caracteres",
      };
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "El formato del correo electrónico no es válido",
      };
    }

    try {
      // Crear el usuario
      const user = await User.create({
        username,
        email,
        password, // El password se hasheará automáticamente por el middleware del modelo
      });

      // Devolver el usuario sin la contraseña
      return {
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt,
        },
      };
    } catch (error: any) {
      // Manejar errores de duplicados
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return {
          success: false,
          error: `El ${field === "email" ? "correo electrónico" : "nombre de usuario"} ya está en uso`,
        };
      }

      return {
        success: false,
        error: "Error al registrar el usuario",
      };
    }
  }
}
