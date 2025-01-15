import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { FileUploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
  // res.status(200).json({
  //     message:"ok thek hai"
  // })
  const { fullname, email, username, password } = req.body;
  console.log("email is ", email);
  console.log("password is ", password);
  // if(fullname==="")
  // {
  //     throw new ApiError(200,"Give Full Name ")
  // }
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(200, "All fields are required");
  }
  const existedUser = User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "Email or Username already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please provide an avatar");
  }
  const avatar = await FileUploadToCloudinary(avatarLocalPath);
  const coverImage = await FileUploadToCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar File is Required");
  }
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  const createdUser = await User.findById(user._id).select(
    "-password refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Error while registering");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});
export { registerUser };
