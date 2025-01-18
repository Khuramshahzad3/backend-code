import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { FileUploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

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
    const decodedToken = jwt.verify(
      incomingrefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    if (incomingrefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token has expired or used");
    }
    const options = {
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
    throw new ApiError(401, error?.message || "Invalid Refresh Token")
  }
})
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid Old Password")
  }
  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  return res.status(200).json(new ApiResponse(200, {}, "Password Changed Successfully"))

})
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successfully"))
})
const updateAccountDetail = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required")
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      fullname: fullname,
      email: email
    }
  }, { new: true }).select("-password")
  return res.status(200).json(new ApiResponse(200, user, "Account Details Updated Successfully"))
})
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please provide an avatar");
  }
  const avatar = await FileUploadToCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar File is Required");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      avatar: avatar.url
    }
  }, { new: true }).select("-password")
  return res.status(200).json(new ApiResponse(200, user, "Avatar Updated Successfully"))
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const CoverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!CoverImageLocalPath) {
    throw new ApiError(400, "Please provide an CoverImage");
  }
  const coverImage = await FileUploadToCloudinary(CoverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(400, "CoverImage File is Required");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      coverImage: coverImage.url
    }
  }, { new: true }).select("-password")
  return res.status(200).json(new ApiResponse(200, user, "CoverImage Updated Successfully"))
})
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing")
  }
  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1
      }
    }
  ])
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist")
  }
  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel Profile Fetched Successfully"))
})
const getWatchHistory = asyncHanlder(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user._id) }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
  ])
  return res
   .status(200)
   .json(new ApiResponse(200, user[0].watchHistory, "Watch History Fetched Successfully"))
})
export {
  registerUser,
  loginUser, logoutUser,
  refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetail,
  updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory
};
