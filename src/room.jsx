import React, { useCallback, useEffect, useState } from "react";
import { usePeer } from "./providers/peer";
import { useSocket } from "./providers/socket";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
function Room() {
  const { socket } = useSocket();
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteId, setRemoteId] = useState(null);
  const { createOffer, createAnswer, setRemoteAns, peer } = usePeer();
  const [myStream, setMyStream] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("waiting");


  const handleRoom = useCallback(
    async (data) => {
      const {room}=data;
      setRoom(room);
    },
    []
  );
  useEffect(() => {
    socket.on("waiting", () => setStatus("waiting"));
    socket.on("roomJoined",handleRoom);
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
      socket.off("waiting");
      socket.off("room-joined",handleRoom);
    };
  // eslint-disable-next-line no-use-before-define
  }, [handleRoom, socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && room) {
      socket.emit("sendMessage", { room, message });
      setChat((prev) => [...prev, { text: message, isMe: true }]);
      setMessage("");
    }
  };
  const handleRoomJoined = useCallback(
    async (data) => {
      const { id } = data;
      setRemoteId(id);
      console.log("Room joined, creating offer...");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
  
        const offer = await createOffer();
        socket.emit("call-user", { id, offer });
        console.log("Offer sent to user:", id);
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    },
    [createOffer, socket]
  );
  const sendStream = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((track) => {
        const senderExists = peer.getSenders().some(
          (sender) => sender.track === track
        );
        if (!senderExists) {
          peer.addTrack(track, myStream);
        }
      });
    }
  }, [myStream, peer]);
  

  const handleIncomingCall = useCallback(
    async (data) => {
      const { id, offer } = data;
      console.log("Incoming call from:", id);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
        setRemoteId(id);
        
        const ans = await createAnswer(offer);
        socket.emit("call-accepted", { id, ans });
      } catch (error) {
        console.error("Error creating answer:", error);
      }
    },
    [createAnswer, socket]
  );

  const handleCallAccepted = useCallback(
    async (data) => {
      const { ans } = data;
      try {
        await setRemoteAns(ans);
        sendStream();
        console.log("Call accepted, connection established.");
      } catch (error) {
        console.error("Error setting remote answer:", error);
      }
    },
    [sendStream, setRemoteAns]
  );
  const handleNegoIncomingCall = useCallback(
    async (data) => {
      const { id, offer } = data;
      console.log("Nego Incoming call from:", id);
      try {
        const ans = await createAnswer(offer);
        sendStream();
        socket.emit("nego-call-accepted", { id, ans });
      } catch (error) {
        console.error("Error creating answer:", error);
      }
    },
    [createAnswer, sendStream, socket]
  );

  const handleNegoCallAccepted = useCallback(
    async (data) => {
      const { ans } = data;
      try {
        await setRemoteAns(ans);
        console.log("Nego Call accepted, connection established.");
      } catch (error) {
        console.error("Error setting remote answer:", error);
      }
    },
    [setRemoteAns]
  );
  useEffect(() => {
    const handleTrackEvent = (event) => {
      console.log("Received remote stream", event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    peer.addEventListener("track", handleTrackEvent);

    return () => {
      peer.removeEventListener("track", handleTrackEvent);
    };
  }, [peer]);


  useEffect(() => {
    const handleNegotiation = async () => {
      try {
        if (!remoteId) {
          console.log("Remote ID not set, skipping negotiation.");
          return;
        }
        console.log("Negotiation needed, creating offer...");
        const offer = await createOffer();
     
        socket.emit("nego-call-user", { id: remoteId, offer });
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    peer.addEventListener("negotiationneeded", handleNegotiation);

    return () => {
      peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  }, [peer, createOffer, socket, remoteId]);


  
  useEffect(() => {
    socket.on("joined-room", handleRoomJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("nego-incoming-call", handleNegoIncomingCall);
    socket.on("nego-call-accepted", handleNegoCallAccepted);

    return () => {
      socket.off("joined-room", handleRoomJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("nego-incoming-call", handleNegoIncomingCall);
      socket.off("nego-call-accepted", handleNegoCallAccepted);
    };
  }, [socket, handleRoomJoined, handleIncomingCall, handleCallAccepted, handleNegoIncomingCall, handleNegoCallAccepted]);

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="flex h-full  p-4 space-x-4 relative">
        {/* Video Streams Section */}
        <div className="flex-1 flex flex-col space-y-4">
          {/* Remote Stream */}
          {remoteStream && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative  bg-black rounded-xl lg:h-full h-2/3 overflow-hidden shadow-2xl border-2 border-cyan-400"
            >
              <div className="absolute top-2 left-2 bg-black/50 px-3 py-1 rounded-full text-cyan-400 text-sm">
                Partner
              </div>
              <ReactPlayer
                playing
                url={remoteStream}
                width="100%"
                height="100%"
                className="rounded-lg"
              />
            </motion.div>
          )}

          {/* Local Stream */}
          {myStream && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:absolute lg:bottom-20 lg:left-20  h-1/3  bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-purple-400"
            >
              <div className="relative top-2 left-2 bg-black/50 px-3 py-1 rounded-full text-purple-400 text-sm">
                You
              </div>
              <ReactPlayer
                playing
                muted
                url={myStream}
                width="100%"
                height="100%"
                className="rounded-lg"
              />
            </motion.div>
          )}
        </div>

        {/* Chat Section */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="w-96 bg-black/80 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-cyan-400/30 flex flex-col"
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
                      msg.isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-xl ${
                        msg.isSystem
                          ? "bg-cyan-400/20 text-cyan-400 text-center"
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
          )}
        </AnimatePresence>

        {/* Chat Toggle Button */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="absolute top-6 right-6 w-12 h-12 bg-cyan-400/20 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-cyan-400/30 transition-colors shadow-2xl border border-cyan-400/30"
        >
          <svg
            className={`w-6 h-6 text-cyan-400 transition-transform ${
              showChat ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </div>
      <div className="absolute flex bottom-5 w-full justify-center  text-white px-1 py-2 rounded">
        <button  className="bg-red-700 p-4 rounded-lg">
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
}

// Styles remain the same

export default Room;
