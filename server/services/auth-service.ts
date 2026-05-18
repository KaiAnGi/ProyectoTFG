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

    // Validate passwords match
    if (password !== confirmPassword) {
      return {
        success: false,
        error: "Passwords do not match",
      };
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      };
    }

    // Validar longitud mínima de nombre de usuario
    if (username.length < 3) {
      return {
        success: false,
        error: "Username must be at least 3 characters",
      };
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Email format is not valid",
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
          error: `The ${field === "email" ? "email" : "username"} is already in use`,
        };
      }

        return {
          success: false,
          error: "Error registering user",
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
        error: "Email and password are required",
      };
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Email format is not valid",
      };
    }

    try {
      // Buscar el usuario por email
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return {
          success: false,
          error: "Incorrect username or password",
        };
      }

      // Comparar contraseñas
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Incorrect username or password",
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
          bones: user.bones ?? 25,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "Error logging in",
      };
    }
  }
}
