import { Server } from "socket.io";
import { createServer } from "http";
import type { Express } from "express";
import { setupGameHandlers } from "./gameHandler.ts";
import { FriendsHandler } from "./friendsHandler.ts";

export function initializeSocketIO(app: Express) {
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Inicializar handlers
  setupGameHandlers(io);
  const friendsHandler = new FriendsHandler(io);

  // Middleware de autenticación para sockets
  io.use(async (socket, next) => {
    try {
      const username = socket.handshake.auth.username;
      const token = socket.handshake.auth.token;

      if (username) {
        (socket as any).username = username;
        friendsHandler.registerUser(socket, username);
        console.log(`Usuario autenticado: ${username}`);
      }
    } catch (error) {
      console.error("Error authenticating socket:", error);
    }
    next();
  });

  // Configurar eventos de amigos
  io.on("connection", (socket) => {
    const username = (socket as any).username || "desconocido";
    console.log(`Usuario conectado: ${username} (${socket.id})`);

    // Eventos de amigos
    socket.on("send_friend_request", (data) =>
      friendsHandler.handleSendFriendRequest(socket, data),
    );
    socket.on("accept_friend_request", (data) =>
      friendsHandler.handleAcceptFriendRequest(socket, data),
    );
    socket.on("reject_friend_request", (data) =>
      friendsHandler.handleRejectFriendRequest(socket, data),
    );
    socket.on("remove_friend", (data) =>
      friendsHandler.handleRemoveFriend(socket, data),
    );
    socket.on("send_chat_message", (data) =>
      friendsHandler.handleSendChatMessage(socket, data),
    );
    socket.on("mark_chat_messages_read", (data) =>
      friendsHandler.handleMarkChatMessagesRead(socket, data),
    );

    // Manejar desconexión
    socket.on("disconnect", () => {
      const username = (socket as any).username;
      if (username) {
        friendsHandler.unregisterUser(username);
      }
      console.log("Usuario desconectado:", socket.id);
    });
  });

  console.log("Socket.IO configurado");

  return httpServer;
}
