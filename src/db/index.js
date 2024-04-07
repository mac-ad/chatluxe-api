import mongoose from "mongoose";

export let dbInstance = undefined;

export const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${process.env.DB_NAME}`
    );
    dbInstance = connectionInstance;
    console.log(
      `\n☘️  MongoDB Connected! Db host: ${connectionInstance.connection.host}\n`
    );
  } catch (err) {
    console.log("mongodb connection error", err);
    process.exit(1);
  }
};
