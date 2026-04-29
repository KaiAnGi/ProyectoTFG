import { Request, Response } from "express";
import { FriendsService } from "../services/friends-service.js";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";

export class FriendsController {
  // Enviar solicitud de amistad
  static async sendFriendRequest(req: Request, res: Response) {
    try {
      const { toUsername } = req.body;
      const fromUsername = (req as AuthenticatedRequest).user?.username;

      if (!fromUsername) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no autenticado" });
      }

      if (!toUsername) {
        return res
          .status(400)
          .json({ success: false, message: "Nombre de usuario requerido" });
      }

      const result = await FriendsService.sendFriendRequest(
        fromUsername,
        toUsername,
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in sendFriendRequest:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Aceptar solicitud de amistad
  static async acceptFriendRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no autenticado" });
      }

      const username = usernameRaw as string;
      const result = await FriendsService.acceptFriendRequest(
        requestId,
        username,
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in acceptFriendRequest:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Rechazar solicitud de amistad
  static async rejectFriendRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no autenticado" });
      }

      const username = usernameRaw as string;
      const result = await FriendsService.rejectFriendRequest(
        requestId,
        username,
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in rejectFriendRequest:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Eliminar amigo
  static async removeFriend(req: Request, res: Response) {
    try {
      const { friendUsername } = req.params;
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no autenticado" });
      }

      const username = usernameRaw as string;
      const result = await FriendsService.removeFriend(
        username,
        friendUsername,
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in removeFriend:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Obtener amigos
  static async getFriends(req: Request, res: Response) {
    try {
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no autenticado" });
      }

      const username = usernameRaw as string;
      const friends = await FriendsService.getFriends(username);
      res.json({ success: true, friends });
    } catch (error) {
      console.error("Error in getFriends:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Obtener solicitudes pendientes
  static async getPendingRequests(req: Request, res: Response) {
    try {
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no autenticado" });
      }

      const username = usernameRaw as string;
      const requests = await FriendsService.getPendingRequests(username);
      res.json({ success: true, requests });
    } catch (error) {
      console.error("Error in getPendingRequests:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Obtener mensajes de chat
  static async getChatMessages(req: Request, res: Response) {
    try {
      const { friendUsername } = req.params;
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no autenticado" });
      }

      const username = usernameRaw as string;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await FriendsService.getChatMessages(
        username,
        friendUsername,
        limit,
      );
      res.json({ success: true, messages });
    } catch (error) {
      console.error("Error in getChatMessages:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Obtener conteo de mensajes no leídos
  static async getUnreadMessageCount(req: Request, res: Response) {
    try {
      const usernameRaw = (req as AuthenticatedRequest).user?.username;

      if (!usernameRaw || Array.isArray(usernameRaw)) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no autenticado" });
      }

      const username = usernameRaw as string;
      const unreadCounts = await FriendsService.getUnreadMessageCount(username);
      res.json({ success: true, unreadCounts });
    } catch (error) {
      console.error("Error in getUnreadMessageCount:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }
}
