import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./providers/socket";
import { motion, AnimatePresence } from "framer-motion";

const Chat = () => {
  const [status, setStatus] = useState("waiting");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  const { socket } = useSocket();
  const messagesEndRef = useRef(null);

  const handleRoomJoined = useCallback((data) => {
    try {
      const { room } = data;
      setRoom(room);
      setStatus("paired");
      console.log("Connected:", room);
    } catch (error) {
      console.error("Error connecting:", error);
    }
  }, []);

  useEffect(() => {
    socket.on("chatRoomJoined", handleRoomJoined);
    socket.on("waiting", () => setStatus("waiting"));
    socket.on("message", (msg) =>
      setChat((prev) => [...prev, { text: msg, isMe: false }])
    );
    socket.on("partner-disconnected", () => {
      setChat((prev) => [
        ...prev,
        {
          text: "Partner has disconnected. Searching for new partner...",
          isSystem: true,
        },
      ]);
      setStatus("waiting"); // Update status visually
      socket.emit("joinChatRoom");
    });

    socket.on("notification", (data) => {
      setChat((prev) => [...prev, { text: data.message, isSystem: true }]);
    });

    return () => {
      socket.off("chatRoomJoined", handleRoomJoined);
      socket.off("waiting");
      socket.off("message");
      socket.off("partner-disconnected");
      socket.off("notification");
    };
  }, [handleRoomJoined, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const startChat = () => {
    socket.emit("joinChatRoom");
  };

  const endChat = () => {
    socket.emit("endChat", room);
    setStatus("disconnected");
    setRoom("");
    setChat([]);
    setMessage("");
    setShowConfirmPopup(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && room) {
      socket.emit("sendMessage", { room, message });
      setChat((prev) => [...prev, { text: message, isMe: true }]);
      setMessage("");
    }
  };

  useEffect(() => {
    // Push a fake history entry when the chat starts
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = (event) => {
      if (room) {
        setShowConfirmPopup(true); // Show confirmation popup instead of going back
        window.history.pushState(null, null, window.location.pathname); // Prevent back navigation
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [room]);

  const openConfirmPopup = () => setShowConfirmPopup(true);
  const closeConfirmPopup = () => setShowConfirmPopup(false);

  if (status === "waiting") {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gray-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
             <div className="absolute top-[30%] left-[30%] w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse"></div>
        </div>

        <div className="flex p-8 flex-col items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-10 max-w-sm w-full mx-4">
          <div className="w-16 h-16 mb-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl font-bold text-white mb-2">Searching for a partner...</p>
          <p className="text-gray-400 text-sm mb-6 text-center">We're connecting you with someone random. Hang tight!</p>
          <button 
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-lg hover:shadow-red-500/20" 
            onClick={endChat}
          >
            Cancel Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-4xl h-full bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
            <div className="flex items-center gap-3">
               <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
               <div>
                   <h2 className="text-xl font-bold text-white">Anonymous Chat</h2>
                   <p className="text-xs text-gray-400">Connected to a stranger</p>
               </div>
            </div>
            
            {status === "disconnected" ? (
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-green-500/20"
              onClick={startChat}
            >
              Start New Chat
            </button>
          ) : (
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all hover:bg-red-700/80"
              onClick={openConfirmPopup}
            >
              End Chat
            </button>
          )}
        </div>

        {/* Messages */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent bg-gradient-to-b from-transparent to-black/20"
          >
            {chat.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${
                  msg.isSystem
                    ? "justify-center my-4"
                    : msg.isMe
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] md:max-w-[60%] p-4 rounded-2xl shadow-md ${
                    msg.isSystem
                      ? "bg-white/5 border border-white/10 text-gray-400 text-sm py-1 px-4 rounded-full"
                      : msg.isMe
                      ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-none"
                      : "bg-gray-700 text-gray-100 rounded-bl-none border border-white/5"
                  }`}
                >
                  <p className="text-base leading-relaxed">{msg.text}</p>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </motion.div>
        </AnimatePresence>

        {/* Input Area */}
        {status !== "disconnected" && (
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md"
            >
              <div className="flex gap-4">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-900/50 border border-gray-600 rounded-xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1 active:translate-y-0"
                >
                  Send
                </button>
              </div>
            </form>
        )}

      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-800 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold text-white mb-4">End Chat?</h3>
            <p className="text-gray-400 mb-8">
              Are you sure you want to disconnect from this stranger?
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
                onClick={endChat}
              >
                Yes, End it
              </button>
              <button
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
                onClick={closeConfirmPopup}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
