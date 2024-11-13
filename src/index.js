import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
dotenv.config();
const port = process.env.PORT
import app from "./app.js"
connectDB().then(()=>{
    app.listen(port,()=>{
        console.log(`Server is running on port ${port}`)
    })
}).catch((err)=>{
    console.error("MongoDB Connection Error\n", error);
 })
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