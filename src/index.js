import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./db/index.js";
dotenv.config();
const port = process.env.PORT
const app = express();
connectDB();
/*
;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("Error", (error) => {
            console.log("Error: ", error)
            throw error
        })
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`)
        })
    } catch (error) {
        console.error("Error", error)
        throw error
    }
})

*/