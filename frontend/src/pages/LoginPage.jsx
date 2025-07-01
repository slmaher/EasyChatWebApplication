import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare } from "lucide-react";
import React from "react";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(formData);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4 font-roboto">
      <div className="bg-base-100 rounded-2xl shadow-xl overflow-hidden max-w-6xl w-full">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Sign In Form */}
          <div className="flex-1 p-8 lg:p-12">
            <div className="max-w-md mx-auto space-y-8">
              {/* Logo */}
              <div className="text-center mb-8">
                <div className="flex flex-col items-center gap-2 group">
                  <div
                    className="w-12 h-12 rounded-xl bg-[#FFB800]/10 flex items-center justify-center group-hover:bg-[#FFB800]/20
                  transition-colors"
                  >
                    <MessageSquare className="w-6 h-6 text-[#FFB800]" />
                  </div>
                  <h1 className="text-2xl font-bold mt-2 tracking-tight">Welcome to EasyChat</h1>
                  <p className="text-base-content/60 font-normal">Sign in to your account</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-base-content/40" />
                    </div>
                    <input
                      type="email"
                      className="input input-bordered w-full pl-10 font-normal focus:border-[#FFB800] focus:ring-[#FFB800]"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Password</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-base-content/40" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input input-bordered w-full pl-10 font-normal focus:border-[#FFB800] focus:ring-[#FFB800]"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-base-content/40" />
                      ) : (
                        <Eye className="h-5 w-5 text-base-content/40" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 text-white font-medium bg-[#FFB800] hover:bg-[#F2A900] rounded-lg transition-colors"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <div className="text-center">
                <p className="text-base-content/60 font-normal">
                  Don&apos;t have an account?{" "}
                  <Link to="/signup" className="text-[#FFB800] hover:text-[#F2A900] font-medium">
                    Create account
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="hidden lg:block p-12">
            <img
              src="/avatar.png"
              alt="Login illustration"
              className="w-[400px] h-auto object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
