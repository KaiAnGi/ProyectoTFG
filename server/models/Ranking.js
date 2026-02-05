const mongoose = require('mongoose');

const rankingSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  totalGames: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ranking', rankingSchema);
