import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaderboard extends Document {
  playerName: string;
  consecutiveWins: number;
}

const leaderboardSchema: Schema<ILeaderboard> = new Schema(
  {
    playerName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 15,
    },
    consecutiveWins: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Leaderboard: Model<ILeaderboard> = mongoose.model<ILeaderboard>(
  "Leaderboard",
  leaderboardSchema,
);

export default Leaderboard;
