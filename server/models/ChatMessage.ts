import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  from: string; // username del remitente
  to: string; // username del destinatario
  message: string;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const chatMessageSchema: Schema<IChatMessage> = new Schema(
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
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Índices para consultas eficientes
chatMessageSchema.index({ from: 1, to: 1, createdAt: -1 });
chatMessageSchema.index({ to: 1, read: 1 });

export const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema,
);
