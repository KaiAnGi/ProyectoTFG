import connectDB from './config/db.ts';
import Leaderboard from './models/Leaderboard.ts';

async function check() {
  await connectDB();
  const top = await Leaderboard.find()
    .sort({ consecutiveWins: -1 })
    .limit(10);
  console.log('Datos OK:');
  top.forEach((p: any) => console.log(`${p.playerName}: ${p.consecutiveWins}`));
}

check();