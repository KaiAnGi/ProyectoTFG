import mongoose, { Schema, Document } from "mongoose";

export interface IFriendRequest extends Document {
  from: string; // username del que envía la solicitud
  to: string; // username del que recibe la solicitud
  status: "pending" | "accepted" | "rejected";
  createdAt?: Date;
  updatedAt?: Date;
}

const friendRequestSchema: Schema<IFriendRequest> = new Schema(
  {
    from: {
      type: String,
      required: true,
      trim: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

// Índice compuesto para evitar solicitudes duplicadas
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

export const FriendRequest = mongoose.model<IFriendRequest>(
  "FriendRequest",
  friendRequestSchema,
);
