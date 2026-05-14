import { Socket } from "socket.io";
import { FriendsService } from "../services/friends-service.js";
import User from "../models/User.js";
import { FriendRequest, IFriendRequest } from "../models/FriendRequest.js";

export class FriendsHandler {
  private connectedUsers: Map<string, string[]> = new Map(); // username -> socketIds[]

  constructor(private io: any) {}

  // Registrar conexión de usuario
  registerUser(socket: Socket, username: string) {
    const sockets = this.connectedUsers.get(username) || [];
    if (!sockets.includes(socket.id)) {
      sockets.push(socket.id);
    }
    this.connectedUsers.set(username, sockets);
    console.log(`Usuario ${username} conectado con socket ${socket.id}`);
  }

  // Desregistrar conexión de usuario (solo este socket, no todos)
  unregisterUser(socketId: string, username: string) {
    const sockets = this.connectedUsers.get(username);
    if (sockets) {
      const idx = sockets.indexOf(socketId);
      if (idx !== -1) {
        sockets.splice(idx, 1);
      }
      if (sockets.length === 0) {
        this.connectedUsers.delete(username);
      }
      console.log(`Socket ${socketId} de ${username} desconectado`);
    }
  }

  // Obtener todos los socket IDs de un usuario
  private getSocketIds(username: string): string[] | undefined {
    return this.connectedUsers.get(username);
  }

  // Manejar envío de solicitud de amistad
  async handleSendFriendRequest(socket: Socket, data: { toUsername: string }) {
    try {
      const fromUsername = (socket as any).username;
      if (!fromUsername) {
        socket.emit("error", { message: "Usuario no autenticado" });
        return;
      }

      const result = await FriendsService.sendFriendRequest(
        fromUsername,
        data.toUsername,
      );

      if (result.success) {
        // Notificar al remitente
        socket.emit("friend_request_sent", {
          toUsername: data.toUsername,
          message: result.message,
        });

        // Notificar al destinatario si está conectado
        const toSocketIds = this.getSocketIds(data.toUsername);
        if (toSocketIds && toSocketIds.length > 0) {
          // Obtener el ID de la solicitud para el destinatario
          const requests = await FriendsService.getPendingRequests(
            data.toUsername,
          );
          const request = requests.find(
            (r: IFriendRequest) =>
              r.from === fromUsername && r.to === data.toUsername,
          );

          if (request) {
            for (const sid of toSocketIds) {
              this.io.to(sid).emit("friend_request_received", {
                fromUsername,
                requestId: request._id.toString(),
              });
            }
          }
        }
      } else {
        socket.emit("error", { message: result.message });
      }
    } catch (error) {
      console.error("Error in handleSendFriendRequest:", error);
      socket.emit("error", { message: "Error interno del servidor" });
    }
  }

  // Manejar aceptación de solicitud de amistad
  async handleAcceptFriendRequest(socket: Socket, data: { requestId: string }) {
    try {
      const username = (socket as any).username;
      if (!username) {
        socket.emit("error", { message: "Usuario no autenticado" });
        return;
      }

      // Obtener la solicitud antes de procesarla
      const request = await FriendRequest.findById(data.requestId);
      if (!request) {
        socket.emit("error", { message: "Solicitud no encontrada" });
        return;
      }

      const result = await FriendsService.acceptFriendRequest(
        data.requestId,
        username,
      );

      if (result.success) {
        if (request) {
          // Notificar al que aceptó
          socket.emit("friend_request_accepted", {
            friendUsername: request.from,
          });

          // Notificar al que envió la solicitud si está conectado
          const fromSocketIds = this.getSocketIds(request.from);
          if (fromSocketIds) {
            for (const sid of fromSocketIds) {
              this.io.to(sid).emit("friend_request_accepted", {
                friendUsername: username,
              });
            }
          }
        }
      } else {
        socket.emit("error", { message: result.message });
      }
    } catch (error) {
      console.error("Error in handleAcceptFriendRequest:", error);
      socket.emit("error", { message: "Error interno del servidor" });
    }
  }

  // Manejar rechazo de solicitud de amistad
  async handleRejectFriendRequest(socket: Socket, data: { requestId: string }) {
    try {
      const username = (socket as any).username;
      if (!username) {
        socket.emit("error", { message: "Usuario no autenticado" });
        return;
      }

      // Obtener la solicitud antes de procesarla
      const request = await FriendRequest.findById(data.requestId);
      if (!request) {
        socket.emit("error", { message: "Solicitud no encontrada" });
        return;
      }

      const result = await FriendsService.rejectFriendRequest(
        data.requestId,
        username,
      );

      if (result.success) {
        if (request) {
          // Notificar al que rechazó (opcional)
          socket.emit("friend_request_rejected", {
            fromUsername: request.from,
          });

          // Notificar al que envió la solicitud si está conectado
          const fromSocketIds = this.getSocketIds(request.from);
          if (fromSocketIds) {
            for (const sid of fromSocketIds) {
              this.io.to(sid).emit("friend_request_rejected", {
                fromUsername: username,
              });
            }
          }
        }
      } else {
        socket.emit("error", { message: result.message });
      }
    } catch (error) {
      console.error("Error in handleRejectFriendRequest:", error);
      socket.emit("error", { message: "Error interno del servidor" });
    }
  }

  // Manejar eliminación de amigo
  async handleRemoveFriend(socket: Socket, data: { friendUsername: string }) {
    try {
      const username = (socket as any).username;
      if (!username) {
        socket.emit("error", { message: "Usuario no autenticado" });
        return;
      }

      const result = await FriendsService.removeFriend(
        username,
        data.friendUsername,
      );

      if (result.success) {
        // Notificar al que eliminó
        socket.emit("friend_removed", {
          friendUsername: data.friendUsername,
        });

        // Notificar al amigo eliminado si está conectado
        const friendSocketIds = this.getSocketIds(data.friendUsername);
        if (friendSocketIds) {
          for (const sid of friendSocketIds) {
            this.io.to(sid).emit("friend_removed", {
              friendUsername: username,
            });
          }
        }
      } else {
        socket.emit("error", { message: result.message });
      }
    } catch (error) {
      console.error("Error in handleRemoveFriend:", error);
      socket.emit("error", { message: "Error interno del servidor" });
    }
  }

  // Manejar envío de mensaje de chat
  async handleSendChatMessage(
    socket: Socket,
    data: { to: string; message: string },
  ) {
    try {
      const from = (socket as any).username;
      if (!from) {
        socket.emit("error", { message: "Usuario no autenticado" });
        return;
      }

      const result = await FriendsService.sendChatMessage(
        from,
        data.to,
        data.message,
      );

      if (result.success && typeof result.message !== "string") {
        const messageData = {
          _id: result.message._id,
          from,
          to: data.to,
          message: data.message,
          read: result.message.read,
          createdAt: result.message.createdAt,
        };

        // Enviar mensaje al destinatario si está conectado
        const toSocketIds = this.getSocketIds(data.to);
        if (toSocketIds) {
          for (const sid of toSocketIds) {
            this.io.to(sid).emit("chat_message", messageData);
          }
        }

        // Confirmar envío al remitente también
        socket.emit("chat_message", messageData);
      } else {
        const errorMessage =
          typeof result.message === "string"
            ? result.message
            : "Error al enviar mensaje";
        socket.emit("error", { message: errorMessage });
      }
    } catch (error) {
      console.error("Error in handleSendChatMessage:", error);
      socket.emit("error", { message: "Error interno del servidor" });
    }
  }

  // Manejar marcado de mensajes como leídos
  async handleMarkChatMessagesRead(
    socket: Socket,
    data: { friendUsername: string },
  ) {
    try {
      const username = (socket as any).username;
      if (!username) {
        socket.emit("error", { message: "Usuario no autenticado" });
        return;
      }

      await FriendsService.markMessagesAsRead(data.friendUsername, username);

      // Notificar al amigo que los mensajes fueron leídos
      const friendSocketIds = this.getSocketIds(data.friendUsername);
      if (friendSocketIds) {
        for (const sid of friendSocketIds) {
          this.io.to(sid).emit("chat_messages_read", {
            friendUsername: username,
          });
        }
      }
    } catch (error) {
      console.error("Error in handleMarkChatMessagesRead:", error);
    }
  }
}
