import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateFields = {};

    // Handle profilePic update if present
    if (req.body.profilePic) {
      try {
        // Log Cloudinary configuration
        console.log('Cloudinary Config:', {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not Set',
          apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not Set',
          apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not Set'
        });

        // Ensure we have the base64 data
        const base64Data = req.body.profilePic.includes('base64,') ? req.body.profilePic.split('base64,')[1] : req.body.profilePic;

        // Upload to Cloudinary with proper options
        const uploadResponse = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${base64Data}`,
          {
            folder: 'profile_pics',
            resource_type: 'auto',
            format: 'jpg',
            transformation: [
              { width: 500, height: 500, crop: 'fill' },
              { quality: 'auto' }
            ],
            timeout: 60000 // Increase timeout to 60 seconds
          }
        );

        if (!uploadResponse || !uploadResponse.secure_url) {
          throw new Error('Failed to get secure URL from Cloudinary');
        }

        updateFields.profilePic = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error('Detailed upload error:', uploadError);
        console.error('Detailed upload error (stringified):', JSON.stringify(uploadError, null, 2));
        return res.status(500).json({ 
          message: "Failed to upload image",
          error: uploadError.message 
        });
      }
    }

    // Handle preferredLanguage update if present
    if (req.body.preferredLanguage) {
      updateFields.preferredLanguage = req.body.preferredLanguage;
    }

    if (Object.keys(updateFields).length > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true }
      ).select('-password');
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json(updatedUser);
    }

    // If no valid fields provided
    return res.status(400).json({ message: "No valid fields to update" });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
