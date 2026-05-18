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
          message: "You cannot send a friend request to yourself",
        };
      }

      // Verificar que el usuario destinatario existe
      const toUser = await User.findOne({ username: toUsername });
      if (!toUser) {
        return { success: false, message: "User not found" };
      }

      // Verificar que el usuario remitente existe
      const fromUser = await User.findOne({ username: fromUsername });
      if (!fromUser) {
        return { success: false, message: "Sender user not found" };
      }

      // Verificar que no sean amigos ya
      if (fromUser.friends?.includes(toUsername)) {
        return { success: false, message: "Already friends" };
      }

      // Verificar que no haya una solicitud ya existente entre estos usuarios
      const existingRequest = await FriendRequest.findOne({
        from: fromUsername,
        to: toUsername,
      });

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          return {
            success: false,
            message: "You already have a pending request with this user",
          };
        }

        if (existingRequest.status === "accepted") {
          return {
            success: false,
            message: "Already friends",
          };
        }

        if (existingRequest.status === "rejected") {
          existingRequest.status = "pending";
          await existingRequest.save();
          return {
            success: true,
            message: "Request resent successfully",
          };
        }
      }

      const reverseRequest = await FriendRequest.findOne({
        from: toUsername,
        to: fromUsername,
        status: "pending",
      });

      if (reverseRequest) {
        return {
          success: false,
          message: "This user already sent you a pending request",
        };
      }

      // Crear la solicitud
      const friendRequest = new FriendRequest({
        from: fromUsername,
        to: toUsername,
        status: "pending",
      });

      await friendRequest.save();

      return { success: true, message: "Friend request sent successfully" };
    } catch (error: any) {
      if (error?.code === 11000) {
        return {
          success: false,
          message: "A request between these users already exists",
        };
      }
      console.error("Error sending friend request:", error);
      return { success: false, message: "Internal server error" };
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
        return { success: false, message: "Request not found" };
      }

      // Verificar que el usuario sea el destinatario
      if (request.to !== username) {
        return {
          success: false,
          message: "You do not have permission to accept this request",
        };
      }

      // Verificar que esté pendiente
      if (request.status !== "pending") {
        return { success: false, message: "This request has already been processed" };
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

      return { success: true, message: "Request accepted" };
    } catch (error) {
      console.error("Error accepting friend request:", error);
      return { success: false, message: "Internal server error" };
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
        return { success: false, message: "Request not found" };
      }

      // Verificar que el usuario sea el destinatario
      if (request.to !== username) {
        return {
          success: false,
          message: "You do not have permission to reject this request",
        };
      }

      // Verificar que esté pendiente
      if (request.status !== "pending") {
        return { success: false, message: "This request has already been processed" };
      }

      // Actualizar estado de la solicitud
      request.status = "rejected";
      await request.save();

      return { success: true, message: "Request rejected" };
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      return { success: false, message: "Internal server error" };
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
        return { success: false, message: "Not friends" };
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

      return { success: true, message: "Friend removed" };
    } catch (error) {
      console.error("Error removing friend:", error);
      return { success: false, message: "Internal server error" };
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
          message: "You can only send messages to your friends",
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
