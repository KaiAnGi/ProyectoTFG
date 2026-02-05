const Ranking = require('../../models/Ranking');

module.exports = (app) => {
  // GET /api/ranking - Top 50 jugadores
  app.get('/', async (req, res) => {
    try {
      const ranking = await Ranking
        .find()
        .sort({ winRate: -1, wins: -1 })
        .limit(50);
      res.json(ranking);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/ranking/update - Actualizar stats jugador
  app.post('/update', async (req, res) => {
    const { username, wins, losses } = req.body;
    try {
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? (wins / totalGames * 100) : 0;

      await Ranking.findOneAndUpdate(
        { username },
        { 
          wins, losses, totalGames, winRate, 
          lastUpdated: new Date() 
        },
        { upsert: true, new: true }
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
