import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.ts";
import User from "../models/User.ts";

interface PaypalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PaypalCapture {
  id: string;
  status: string;
}

interface PaypalOrderResponse {
  id: string;
  status: string;
  purchase_units: {
    payments?: {
      captures?: PaypalCapture[];
    };
  }[];
}

const BASE = process.env.PAYPAL_API_BASE!;
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const SECRET = process.env.PAYPAL_CLIENT_SECRET!;

const PACKS: Record<string, { price: string; shines: number }> = {
  pack100: { price: "4.65", shines: 100 },
  pack500: { price: "8.70", shines: 500 },
  pack1000: { price: "15.78", shines: 1000 },
};

async function getAccessToken(): Promise<string> {
  const creds = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Error obteniendo token PayPal:", err);
    throw new Error(`Error obteniendo token PayPal: ${res.status}`);
  }

  const data = await res.json() as PaypalTokenResponse;
  return data.access_token;
}

export class PaypalController {
  static async createOrder(req: Request, res: Response) {
    try {
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res.status(401).json({ success: false, message: "Usuario no autenticado" });
      }

      const { packId } = req.body;
      const pack = PACKS[packId];

      if (!pack) {
        return res.status(400).json({ success: false, message: "Pack inválido" });
      }

      const token = await getAccessToken();

      const response = await fetch(`${BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              description: `${pack.shines} Shines`,
              amount: {
                currency_code: "EUR",
                value: pack.price,
              },
            },
          ],
          application_context: {
            // Use FRONTEND_URL if set in env, otherwise fallback to the known frontend URL
            return_url: process.env.FRONTEND_URL || "https://cliente-2a5q.onrender.com",
            cancel_url: process.env.FRONTEND_URL || "https://cliente-2a5q.onrender.com",
            brand_name: "RPS Game",
            user_action: "PAY_NOW",
            landing_page: "LOGIN",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return res.status(500).json({
          success: false,
          message: "Error creando orden en PayPal",
          details: error,
        });
      }

      const data = await response.json() as PaypalOrderResponse;
      res.json({ success: true, orderID: data.id });

    } catch (error) {
      console.error("Error in createOrder:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }

  static async captureOrder(req: Request, res: Response) {
    try {
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res.status(401).json({ success: false, message: "Usuario no autenticado" });
      }

      const { orderID, packId } = req.body;
      const pack = PACKS[packId];

      if (!pack) {
        return res.status(400).json({ success: false, message: "Pack inválido" });
      }

      const token = await getAccessToken();

      const response = await fetch(`${BASE}/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json() as PaypalOrderResponse;

      if (!response.ok) {
        return res.status(500).json({
          success: false,
          message: "Error capturando orden en PayPal",
          details: data,
        });
      }

      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

      if (capture?.status !== "COMPLETED") {
        return res.status(400).json({
          success: false,
          message: "Pago no completado",
          status: capture?.status,
        });
      }

      const updatedUser = await User.findOneAndUpdate(
        { username: usernameRaw },
        { $inc: { bones: pack.shines } },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "No se encontró el usuario para actualizar los shines",
        });
      }

      res.json({
        success: true,
        shinesAdded: pack.shines,
        bones: updatedUser.bones ?? 25,
      });

    } catch (error) {
      console.error("Error in captureOrder:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }

  static async checkOrder(req: Request, res: Response) {
    try {
      const { orderID } = req.params;
      const token = await getAccessToken();

      const response = await fetch(`${BASE}/v2/checkout/orders/${orderID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json() as PaypalOrderResponse;

      const approved = data.status === "APPROVED" || data.status === "COMPLETED";

      res.json({ success: true, approved });

    } catch (error) {
      console.error("Error in checkOrder:", error);
      res.status(500).json({ success: false, approved: false });
    }
  }
}