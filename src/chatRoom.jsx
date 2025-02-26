import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./providers/socket";

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
      setChat((prev) => [
        ...prev,
        {
          text: "Partner has disconnected. Searching for new partner...",
          isSystem: true,
        },
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
            <button className="bg-green-500 px-4 py-2 rounded-md" onClick={startChat}>
              Start New Chat
            </button>
          ) : (
            <button className="bg-red-500 px-4 py-2 rounded-md" onClick={openConfirmPopup}>
              End Chat
            </button>
          )}
          <h3 className="text-lg font-semibold">Chat</h3>
        </header>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
          {chat.map((msg, index) => (
            <div
              key={index}
              className={`max-w-[70%] px-4 py-2 mb-2 rounded-lg text-sm ${
                msg.isSystem
                  ? "bg-gray-500 text-white mx-auto text-center"
                  : msg.isMe
                  ? "bg-blue-500 text-white ml-auto"
                  : "bg-gray-300 text-black mr-auto"
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form className="p-4 flex items-center border-t border-gray-300" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button type="submit" className="ml-2 bg-green-500 text-white px-4 py-2 rounded-md">
            ➤
          </button>
        </form>
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <p className="mb-4 text-gray-800">Are you sure you want to end the chat?</p>
            <div className="flex justify-center gap-4">
              <button className="bg-red-500 text-white px-4 py-2 rounded-md" onClick={endChat}>
                Yes
              </button>
              <button className="bg-gray-400 text-white px-4 py-2 rounded-md" onClick={closeConfirmPopup}>
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
