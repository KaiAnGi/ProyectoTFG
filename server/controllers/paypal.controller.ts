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

interface PaypalPayoutResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
  };
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

      const user = await User.findOne({ username: usernameRaw });
      const body: Record<string, any> = {
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
          return_url: process.env.FRONTEND_URL || "https://cliente-2a5q.onrender.com",
          cancel_url: process.env.FRONTEND_URL || "https://cliente-2a5q.onrender.com",
          brand_name: "RPS Game",
          user_action: "PAY_NOW",
          landing_page: "LOGIN",
        },
      };

      if (user?.paypalVaultId) {
        // Compra recurrente con vault_id guardado en PayPal
        delete body.application_context;
        body.payment_source = {
          paypal: {
            vault_id: user.paypalVaultId,
          },
        };
      } else {
        // Primera compra: solicitar vaulting de PayPal
        body.payment_source = {
          paypal: {
            attributes: {
              vault: {
                store_in_vault: "ON_SUCCESS",
                usage_type: "MERCHANT",
                customer_type: "CONSUMER",
              },
            },
          },
        };
      }

      const response = await fetch(`${BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let error: unknown = errorText;

        try {
          error = JSON.parse(errorText);
        } catch {
          // Keep the raw text when PayPal does not return JSON.
        }

        console.error("PayPal createOrder rejected the request:", response.status, error);
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

      // Extraer vault ID y email del capture
      const paypalSource = (data as any)?.payment_source?.paypal;
      const vaultId: string | undefined =
        paypalSource?.attributes?.vault?.id ??
        paypalSource?.vault_id ??
        (data as any)?.payment_source?.token?.id;
      const vaultEmail: string | undefined =
        paypalSource?.email_address ??
        paypalSource?.customer?.email_address;
      const paypalCustomerId: string | undefined =
        paypalSource?.attributes?.vault?.customer?.id ??
        paypalSource?.customer?.id;

      const vaultUpdate: Record<string, any> = { $inc: { bones: pack.shines } };
      if (vaultId) vaultUpdate.$set = { paypalVaultId: vaultId };
      if (vaultEmail) vaultUpdate.$set = { ...(vaultUpdate.$set || {}), paypalEmail: vaultEmail };
      if (paypalCustomerId) {
        vaultUpdate.$set = {
          ...(vaultUpdate.$set || {}),
          paypalCustomerId,
        };
      }

      const updatedUser = await User.findOneAndUpdate(
        { username: usernameRaw },
        vaultUpdate,
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

  static async refund(req: Request, res: Response) {
    try {
      const usernameRaw = (req as AuthenticatedRequest).user?.username;
      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res.status(401).json({ success: false, message: "Usuario no autenticado" });
      }

      const { amount } = req.body;

      let shinesToRefund: number;

      const user = await User.findOne({ username: usernameRaw });
      if (!user) {
        return res.status(404).json({ success: false, message: "Usuario no encontrado" });
      }

      if (!user.paypalEmail) {
        return res.status(400).json({ success: false, message: "You do not have a registered payment method. You must buy shines at least once before requesting a refund." });
      }

      if (amount === "all") {
        shinesToRefund = user.bones ?? 0;
        if (shinesToRefund <= 0) {
          return res.status(400).json({ success: false, message: "You have no shines to refund" });
        }
      } else {
        shinesToRefund = Number(amount);
        if (!Number.isFinite(shinesToRefund) || ![100, 200, 500, 1000].includes(shinesToRefund)) {
          return res.status(400).json({ success: false, message: "Invalid amount. Options: 100, 200, 500, 1000" });
        }
      }

      const currentBones = user.bones ?? 0;
      if (currentBones < shinesToRefund) {
        return res.status(400).json({ success: false, message: "You do not have enough shines" });
      }

      const eurValue = Math.round((shinesToRefund * 4.65 / 100) * 100) / 100;

      if (eurValue < 1.0) {
        return res.status(400).json({ success: false, message: "The minimum refund is 1.00€ (equivalent to about 22 shines)" });
      }

      const token = await getAccessToken();

      const payoutBatchId = `refund_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const payoutResponse = await fetch(`${BASE}/v1/payments/payouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender_batch_header: {
            sender_batch_id: payoutBatchId,
            email_subject: "RPS Game Refund",
            email_message: `You have received a refund of ${eurValue.toFixed(2)}€ for ${shinesToRefund} shines.`,
          },
          items: [
            {
              recipient_type: "EMAIL",
              amount: {
                value: eurValue.toFixed(2),
                currency: "EUR",
              },
              receiver: user.paypalEmail,
              note: `Refund of ${shinesToRefund} shines`,
              sender_item_id: `refund_${shinesToRefund}`,
            },
          ],
        }),
      });

      const payoutData = await payoutResponse.json() as PaypalPayoutResponse;

      if (!payoutResponse.ok) {
        console.error("Error in PayPal payout:", payoutData);
        return res.status(500).json({
          success: false,
          message: "Error processing the refund in PayPal",
          details: payoutData,
        });
      }

      const updatedUser = await User.findOneAndUpdate(
        { username: usernameRaw },
        { $inc: { bones: -shinesToRefund } },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(500).json({
          success: false,
          message: "Error updating shines after the refund",
        });
      }

      res.json({
        success: true,
        refundedShines: shinesToRefund,
        refundedEur: eurValue,
        bones: updatedUser.bones ?? 0,
        payoutBatchId: payoutData.batch_header.payout_batch_id,
      });

    } catch (error) {
      console.error("Error processing refund:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
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