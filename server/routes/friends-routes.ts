import { Router } from "express";
import { FriendsController } from "../controllers/friends-controller.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Enviar solicitud de amistad
router.post("/request", FriendsController.sendFriendRequest);

// Aceptar solicitud de amistad
router.post(
  "/request/:requestId/accept",
  FriendsController.acceptFriendRequest,
);

// Rechazar solicitud de amistad
router.post(
  "/request/:requestId/reject",
  FriendsController.rejectFriendRequest,
);

// Eliminar amigo
router.delete("/:friendUsername", FriendsController.removeFriend);

// Obtener amigos
router.get("/", FriendsController.getFriends);

// Obtener solicitudes pendientes
router.get("/requests/pending", FriendsController.getPendingRequests);

// Obtener mensajes de chat con un amigo
router.get("/chat/:friendUsername", FriendsController.getChatMessages);

// Obtener conteo de mensajes no leídos
router.get("/chat/unread", FriendsController.getUnreadMessageCount);

export default router;
