import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"


const FileUploadToCloudinary=async (filelocalpath)=>{
    try {
        if(!filelocalpath) return null;
     const response= await  cloudinary.uploader.upload(filelocalpath,{
            resource_type:"auto",
        })
        console.log("File has been uploaded Successfully on Cloudinary",response.url)
        return response;
    } catch (error) {
        fs.unlinkSync(filelocalpath) //it unlink the locally saved file
        return null;
    }
}

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    export {FileUploadToCloudinary}