import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { FileUploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessandRefreshTokens = async (userid) => {
  try {
    const user = await User.findById(userid);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Error while generating access and refresh tokens")
  }
}
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
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "Email or Username already exists");
  }
  console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
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
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Error while registering");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});
const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Email or Username is required");
  }
  const user = await User.findOne({
    $or: [{ email }, { username }]
  });
  if (!user) {
    throw new ApiError(404, "User Not Found");
  }
  const isValidPassword = await user.isPasswordCorrect(password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid Password");
  }
  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
  const options = {
    httpOnly: true,
    secure: true
  }
  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
      user: loggedInUser, accessToken, refreshToken
    }, "User Logged In Successfully"));
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    { new: true }
  )

  const options = {
    httpOnly: true,
    secure: true
  }
  return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
})
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingrefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if (!incomingrefreshToken) {
    throw new ApiError(401, "Refresh Token is required");
  }
  try {
    const decodedToken=jwt.verify(
      incomingrefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    const user= await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    if(incomingrefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh Token has expired or used");
    }
    const options={
      httpOnly: true,
      secure: true
    }
    const { accessToken, newrefreshToken } = await generateAccessandRefreshTokens(user._id)
    return res.status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newrefreshToken, options)
     .json(
       new ApiResponse(200, {
         accessToken, 
         refreshToken: newrefreshToken
       }, "Access Token Refreshed Successfully")
     )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Refresh Token")
  }

})
export { registerUser, loginUser, logoutUser,refreshAccessToken };
