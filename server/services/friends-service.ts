import User, { IUser } from "../models/User.js";
import { FriendRequest, IFriendRequest } from "../models/FriendRequest.js";
import { ChatMessage, IChatMessage } from "../models/ChatMessage.js";

export class FriendsService {
  // Enviar solicitud de amistad
  static async sendFriendRequest(
    fromUsername: string,
    toUsername: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar que no se envíe solicitud a uno mismo
      if (fromUsername === toUsername) {
        return {
          success: false,
          message: "No puedes enviarte solicitud a ti mismo",
        };
      }

      // Verificar que el usuario destinatario existe
      const toUser = await User.findOne({ username: toUsername });
      if (!toUser) {
        return { success: false, message: "Usuario no encontrado" };
      }

      // Verificar que el usuario remitente existe
      const fromUser = await User.findOne({ username: fromUsername });
      if (!fromUser) {
        return { success: false, message: "Usuario remitente no encontrado" };
      }

      // Verificar que no sean amigos ya
      if (fromUser.friends?.includes(toUsername)) {
        return { success: false, message: "Ya son amigos" };
      }

      // Verificar que no haya una solicitud pendiente
      const existingRequest = await FriendRequest.findOne({
        from: fromUsername,
        to: toUsername,
        status: "pending",
      });

      if (existingRequest) {
        return {
          success: false,
          message: "Ya tienes una solicitud pendiente con este usuario",
        };
      }

      // Crear la solicitud
      const friendRequest = new FriendRequest({
        from: fromUsername,
        to: toUsername,
        status: "pending",
      });

      await friendRequest.save();

      return { success: true, message: "Solicitud enviada correctamente" };
    } catch (error) {
      console.error("Error sending friend request:", error);
      return { success: false, message: "Error interno del servidor" };
    }
  }

  // Aceptar solicitud de amistad
  static async acceptFriendRequest(
    requestId: string,
    username: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const request = await FriendRequest.findById(requestId);
      if (!request) {
        return { success: false, message: "Solicitud no encontrada" };
      }

      // Verificar que el usuario sea el destinatario
      if (request.to !== username) {
        return {
          success: false,
          message: "No tienes permiso para aceptar esta solicitud",
        };
      }

      // Verificar que esté pendiente
      if (request.status !== "pending") {
        return { success: false, message: "Esta solicitud ya fue procesada" };
      }

      // Actualizar estado de la solicitud
      request.status = "accepted";
      await request.save();

      // Agregar amigos mutuamente
      await User.findOneAndUpdate(
        { username: request.from },
        { $addToSet: { friends: request.to } },
      );

      await User.findOneAndUpdate(
        { username: request.to },
        { $addToSet: { friends: request.from } },
      );

      return { success: true, message: "Solicitud aceptada" };
    } catch (error) {
      console.error("Error accepting friend request:", error);
      return { success: false, message: "Error interno del servidor" };
    }
  }

  // Rechazar solicitud de amistad
  static async rejectFriendRequest(
    requestId: string,
    username: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const request = await FriendRequest.findById(requestId);
      if (!request) {
        return { success: false, message: "Solicitud no encontrada" };
      }

      // Verificar que el usuario sea el destinatario
      if (request.to !== username) {
        return {
          success: false,
          message: "No tienes permiso para rechazar esta solicitud",
        };
      }

      // Verificar que esté pendiente
      if (request.status !== "pending") {
        return { success: false, message: "Esta solicitud ya fue procesada" };
      }

      // Actualizar estado de la solicitud
      request.status = "rejected";
      await request.save();

      return { success: true, message: "Solicitud rechazada" };
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      return { success: false, message: "Error interno del servidor" };
    }
  }

  // Eliminar amigo
  static async removeFriend(
    username: string,
    friendUsername: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar que sean amigos
      const user = await User.findOne({ username });
      if (!user?.friends?.includes(friendUsername)) {
        return { success: false, message: "No son amigos" };
      }

      // Remover de ambas listas de amigos
      await User.findOneAndUpdate(
        { username },
        { $pull: { friends: friendUsername } },
      );

      await User.findOneAndUpdate(
        { username: friendUsername },
        { $pull: { friends: username } },
      );

      return { success: true, message: "Amigo eliminado" };
    } catch (error) {
      console.error("Error removing friend:", error);
      return { success: false, message: "Error interno del servidor" };
    }
  }

  // Obtener amigos de un usuario
  static async getFriends(username: string): Promise<string[]> {
    try {
      const user = await User.findOne({ username });
      return user?.friends || [];
    } catch (error) {
      console.error("Error getting friends:", error);
      return [];
    }
  }

  // Obtener solicitudes pendientes de un usuario (recibidas)
  static async getPendingRequests(username: string): Promise<IFriendRequest[]> {
    try {
      return await FriendRequest.find({
        to: username,
        status: "pending",
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error("Error getting pending requests:", error);
      return [];
    }
  }

  // Enviar mensaje de chat
  static async sendChatMessage(
    from: string,
    to: string,
    message: string,
  ): Promise<{ success: boolean; message: IChatMessage | string }> {
    try {
      // Verificar que sean amigos
      const fromUser = await User.findOne({ username: from });
      if (!fromUser?.friends?.includes(to)) {
        return {
          success: false,
          message: "Solo puedes enviar mensajes a tus amigos",
        };
      }

      const chatMessage = new ChatMessage({
        from,
        to,
        message: message.trim(),
        read: false,
      });

      await chatMessage.save();

      return { success: true, message: chatMessage };
    } catch (error) {
      console.error("Error sending chat message:", error);
      return { success: false, message: "Error interno del servidor" };
    }
  }

  // Obtener mensajes de chat entre dos usuarios
  static async getChatMessages(
    user1: string,
    user2: string,
    limit: number = 50,
  ): Promise<IChatMessage[]> {
    try {
      return await ChatMessage.find({
        $or: [
          { from: user1, to: user2 },
          { from: user2, to: user1 },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(limit);
    } catch (error) {
      console.error("Error getting chat messages:", error);
      return [];
    }
  }

  // Marcar mensajes como leídos
  static async markMessagesAsRead(from: string, to: string): Promise<void> {
    try {
      await ChatMessage.updateMany({ from, to, read: false }, { read: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }

  // Obtener conteo de mensajes no leídos
  static async getUnreadMessageCount(
    username: string,
  ): Promise<{ [friend: string]: number }> {
    try {
      const unreadCounts: { [friend: string]: number } = {};

      // Obtener todos los amigos
      const user = await User.findOne({ username });
      if (!user?.friends) return unreadCounts;

      // Contar mensajes no leídos de cada amigo
      for (const friend of user.friends) {
        const count = await ChatMessage.countDocuments({
          from: friend,
          to: username,
          read: false,
        });
        if (count > 0) {
          unreadCounts[friend] = count;
        }
      }

      return unreadCounts;
    } catch (error) {
      console.error("Error getting unread message count:", error);
      return {};
    }
  }
}
