import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./providers/socket";
import { motion, AnimatePresence } from "framer-motion";

const Chat = ({}) => {
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
    socket.on("roomJoined", handleRoomJoined);
    socket.on("waiting", () => setStatus("waiting"));
    socket.on("message", (msg) =>
      setChat((prev) => [...prev, { text: msg, isMe: false }])
    );
    socket.on("partner-disconnected", () => {
      setChat([
        {
          text: "Partner has disconnected. Searching for new partner...",
          isSystem: true,
        }
      ]);
    });

    socket.on("notification", (data) => {
      setChat([
        { text: data.message, isSystem: true },
      ]);
    });

    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("waiting");
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

  const openConfirmPopup = () => setShowConfirmPopup(true);
  const closeConfirmPopup = () => setShowConfirmPopup(false);

  if (status === "waiting") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center  bg-white rounded-lg shadow-md">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className=" text-gray-700">Searching for a partner...</p>
          <button className=" bg-red-500 text-white px-4 py-2 rounded-md" onClick={endChat}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full  flex items-start justify-start p-2`}>
      <div className="w-full h-full bg-white  shadow-lg flex flex-col">
        {/* Chat Header */}
        <header className="p-4 bg-gray-800 text-white flex justify-between items-center ">
          {status === "disconnected" ? (
            <button
              className="bg-green-500 px-4 py-2 rounded-md"
              onClick={startChat}
            >
              Start New Chat
            </button>
          ) : (
            <button
              className="bg-red-500 px-4 py-2 rounded-md"
              onClick={openConfirmPopup}
            >
              End Chat
            </button>
          )}
          <h3 className="text-lg font-semibold">Chat</h3>
        </header>

        {/* Messages */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="w-full bg-black/80 backdrop-blur-lg h-screen shadow-2xl border-2 border-cyan-400/30 flex flex-col"
          >
            <div className="p-4 border-b border-cyan-400/30">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Chat
              </h2>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-400/50 scrollbar-track-transparent">
              {chat.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    msg.isSystem
                      ? "justify-center"
                      : msg.isMe
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-xl ${
                      msg.isSystem
                        ? "bg-cyan-400/20  text-cyan-400 text-center"
                        : msg.isMe
                        ? "bg-purple-400/20 text-purple-200"
                        : "bg-cyan-400/20 text-cyan-200"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    {!msg.isSystem && (
                      <span className="text-xs opacity-50 mt-1 block">
                        {msg.isMe ? "You" : "Stranger"}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-cyan-400/30"
            >
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-black/30 border border-cyan-400/30 rounded-lg px-4 py-2 text-cyan-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg font-bold text-black hover:opacity-90 transition-opacity"
                >
                  ⚡
                </button>
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <p className="mb-4 text-gray-800">
              Are you sure you want to end the chat?
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-md"
                onClick={endChat}
              >
                Yes
              </button>
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded-md"
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
