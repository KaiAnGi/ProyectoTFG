import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  friends?: string[];
  bones?: number;
  paypalVaultId?: string;
  paypalEmail?: string;
  paypalCustomerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: Schema<IUser> = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePicture: {
      type: String,
      required: false,
      default: null,
    },
    friends: {
      type: [String],
      required: false,
      default: [],
    },
    // Campo nuevo para los shines/bones comprados
    bones: {
      type: Number,
      required: false,
      default: 0,
    },
    paypalVaultId: { type: String, required: false },
    paypalEmail: { type: String, required: false },
    paypalCustomerId: { type: String, required: false },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

User.syncIndexes().catch((err) => {
  console.error("Error syncing User indexes:", err);
});

export default User;
