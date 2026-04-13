import User from "../models/User.ts";
import type { IUser } from "../models/User.ts";
import jwt from "jsonwebtoken";

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
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

  async login(data: LoginData): Promise<{
    success: boolean;
    token?: string;
    user?: Partial<IUser>;
    error?: string;
  }> {
    const { email, password } = data;

    // Validar que los campos estén presentes
    if (!email || !password) {
      return {
        success: false,
        error: "El correo y la contraseña son obligatorios",
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
      // Buscar el usuario por email
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return {
          success: false,
          error: "Usuario o contraseña incorrectos",
        };
      }

      // Comparar contraseñas
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Usuario o contraseña incorrectos",
        };
      }

      // Generar JWT
      const token = jwt.sign(
        {
          _id: user._id,
          email: user.email,
          username: user.username,
        },
        process.env.JWT_SECRET || "secret_key_change_me",
        { expiresIn: "7d" },
      );

      return {
        success: true,
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al iniciar sesión",
      };
    }
  }
}
