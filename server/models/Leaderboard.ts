import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaderboard extends Document {
  playerName: string;
  matchVictories: number;
}

const leaderboardSchema: Schema<ILeaderboard> = new Schema(
  {
    playerName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    matchVictories: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Leaderboard: Model<ILeaderboard> =
  mongoose.models.Leaderboard ||
  mongoose.model<ILeaderboard>("Leaderboard", leaderboardSchema);

export default Leaderboard;