import { Router } from "express";
import { FriendsController } from "../controllers/friends-controller.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas más específicas PRIMERO
// POST routes
router.post("/request", FriendsController.sendFriendRequest);
router.post(
  "/request/:requestId/accept",
  FriendsController.acceptFriendRequest,
);
router.post(
  "/request/:requestId/reject",
  FriendsController.rejectFriendRequest,
);

// GET routes - específicas primero
router.get("/requests/pending", FriendsController.getPendingRequests);
router.get("/chat/unread", FriendsController.getUnreadMessageCount);
router.get("/chat/:friendUsername", FriendsController.getChatMessages);

// DELETE routes
router.delete("/:friendUsername", FriendsController.removeFriend);

// Obtener amigos - genérica al final
router.get("/", FriendsController.getFriends);

export default router;
