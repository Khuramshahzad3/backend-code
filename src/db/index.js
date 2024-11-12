
import mongoose from "mongoose";
import dotenv from "dotenv";
import { DB_NAME } from "../constants.js";

dotenv.config();
const port=process.env.PORT
const connectDB = async () => {
    
    // console.log("port is ",port)
    // console.log("MONGODB_URL:", process.env.MONGODB_URL); // Check if URL is loaded

    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`MongoDB Connected Successfully: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("MongoDB Connection Error\n", error);
        process.exit(1);
    }
};
export default connectDB;
