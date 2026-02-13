import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/piedrapapeltijera",
    );
    console.log(
      "MongoDB conectado: ",
      process.env.MONGODB_URI || "mongodb://localhost:27017/piedrapapeltijera",
    );
  } catch (error) {
    console.error("Error MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;