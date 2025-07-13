import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";
import React from "react";
import { toast } from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [tempImg, setTempImg] = useState(null);

  const languages = [
    { code: "en", label: "English" },
    { code: "ar", label: "Arabic" },
    { code: "fr", label: "French" },
    { code: "es", label: "Spanish" },
    // Add more as needed
  ];

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, or GIF)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64Image = reader.result;
        console.log("Image loaded successfully");
        setTempImg(base64Image);
      } catch (error) {
        console.error("Error reading file:", error);
        toast.error("Error reading image file");
      }
    };
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      toast.error("Error reading image file");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImage = async () => {
    if (!tempImg) {
      toast.error("Please select an image first");
      return;
    }

    try {
      console.log("Starting image upload process...");
      const loadingToast = toast.loading("Updating profile picture...");
      
      // Ensure we're not already in the process of updating
      if (isUpdatingProfile) {
        toast.dismiss(loadingToast);
        toast.error("Please wait for the current upload to complete");
        return;
      }

      // Send the complete base64 data URL to the backend
      console.log("Sending request to update profile...");
      await updateProfile({ profilePic: tempImg });
      console.log("Profile update request completed");
      
      toast.dismiss(loadingToast);
      toast.success("Profile picture updated successfully");
      
      // Update the selected image after successful upload
      setSelectedImg(tempImg);
      console.log("Local state updated with new image");
      
      // Clear the temp image
      setTempImg(null);
      
    } catch (error) {
      console.error("Error updating profile picture:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(error.response?.data?.message || "Failed to update profile picture. Please try again.");
      setTempImg(null); // Clear temp image on error
    }
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* avatar upload section */}
          <div className="flex flex-col items-center gap-4">
            {(() => {
              console.log("authUser?.profilePic:", authUser?.profilePic);
              console.log("selectedImg:", selectedImg);
              console.log("tempImg:", tempImg);
            })()}
            <div className="relative">
              <img
                src={tempImg || selectedImg || authUser?.profilePic || "/NoAvatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4"
                onError={(e) => {
                  if (e.target.src !== window.location.origin + "/NoAvatar.png" && e.target.src !== "/NoAvatar.png") {
                  console.error("Error loading image, using fallback");
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = "/NoAvatar.png";
                  }
                }}
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleImageSelect}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            {tempImg && !isUpdatingProfile && (
              <button
                onClick={handleSaveImage}
                className="btn btn-primary btn-sm"
                disabled={isUpdatingProfile}
              >
                Save Photo
              </button>
            )}
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile
                ? "Uploading..."
                : tempImg
                ? "Click Save to update your photo"
                : "Click the camera icon to select a photo"}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {authUser?.fullName}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {authUser?.email}
              </p>
            </div>

            {/* Preferred Language Selector */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-">
                <span role="img" aria-label="language">🌐</span>
                Preferred Language
              </div>
              <select
                className="px-4 py-2.5 bg-base-200 rounded-lg border w-full"
                value={authUser?.preferredLanguage || "en"}
                onChange={e => updateProfile({ preferredLanguage: e.target.value })}
                disabled={isUpdatingProfile}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium  mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
