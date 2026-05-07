import { Router } from "express";
import User from "../models/User.ts";

const router = Router();

// GET /api/bones/:username
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json({ bones: user.bones ?? 0 });
  } catch (err) {
    console.error("Error en /api/bones/:username", err);
    return res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;