import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, ShieldCheck, UserCog } from "lucide-react";
import React from "react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header
      className="border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-xl bg-base-100/80 shadow-lg shadow-base-300/20"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2.5 hover:opacity-80 transition-all"
            >
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">CipherChat</h1>
                <p className="text-[10px] uppercase tracking-[0.24em] text-base-content/50 font-mono mt-1">
                  Secure Messaging
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {authUser && (
              <>
                <Link to={"/profile"} className={`btn btn-sm btn-outline gap-2`}>
                  <UserCog className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button className="btn btn-sm btn-outline flex gap-2 items-center" onClick={logout}>
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
