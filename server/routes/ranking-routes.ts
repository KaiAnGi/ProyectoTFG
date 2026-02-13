import { Router } from "express";
import { RankingController } from "../controllers/ranking-controller.ts";

const router = Router();
const rankingController = new RankingController();

// GET /api/ranking
router.get("/", (req, res) => rankingController.getRanking(req, res));

// GET /api/ranking/:playerName
router.get("/:playerName", (req, res) =>
  rankingController.getPlayerStats(req, res),
);

// POST /api/ranking/update
router.post("/update", (req, res) => rankingController.updatePlayer(req, res));

export default router;