import { useChatStore } from "../store/useChatStore";
import React from "react";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser, selectedGroup } = useChatStore();

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="border border-base-300 rounded-3xl shadow-2xl shadow-base-300/20 w-full max-w-7xl h-[calc(100vh-6rem)] backdrop-blur-xl">
          <div className="flex h-full rounded-3xl overflow-hidden">
            <Sidebar />

            {!selectedUser && !selectedGroup ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;
