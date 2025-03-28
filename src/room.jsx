import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePeer } from "./providers/peer";
import { useSocket } from "./providers/socket";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
function Room({ setHomeRoom }) {
  const { socket } = useSocket();
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteId, setRemoteId] = useState(null);
  const { createOffer, createAnswer, setRemoteAns, peer } = usePeer();
  const [myStream, setMyStream] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState("");
  const [buttonText, setButtonText] = useState("End Chat");
  const [status, setStatus] = useState("waiting");
  const [iceState, setIceState] = useState(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const MAX_RETRIES = 3;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timer;
    const resetTimer = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 3000); // Hide after 3 seconds of inactivity
    };

    // Listen for user interactions
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("click", resetTimer);

    // Start the timer on mount
    timer = setTimeout(() => setVisible(false), 3000);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("click", resetTimer);
      clearTimeout(timer);
    };
  }, []);

  const handleRoom = useCallback(
    async (data) => {
      const { room } = data;
      setHomeRoom(room);
      setRoom(room);
    },
    [setHomeRoom]
  );

  useEffect(() => {
    socket.on("waiting", () => setStatus("waiting"));
    socket.on("roomJoined", handleRoom);
    socket.on("videoMessage", (msg) =>
      setChat((prev) => [...prev, { text: msg, isMe: false }])
    );

    socket.on("notification", (data) => {
      setChat([{ text: data.message, isSystem: true }]);
    });

    return () => {
      socket.off("waiting");
      socket.off("roomJoined", handleRoom);
    };
    // eslint-disable-next-line no-use-before-define
  }, [handleRoom, socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && room) {
      socket.emit("sendVideoMessage", { room, message });
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
        const senderExists = peer
          .getSenders()
          .some((sender) => sender.track === track);
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

  const handleNegoCallAccepted = useCallback(
    async (data) => {
      const { ans } = data;
      try {
        await setRemoteAns(ans);
        sendStream();
        console.log("Nego Call accepted, connection established.");
      } catch (error) {
        console.error("Error setting remote answer:", error);
      }
    },
    [sendStream, setRemoteAns]
  );
  // Update handlePartnerDisconnected
  const handlePartnerDisconnected = useCallback(async () => {
    try {
      console.log("am i running");
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
        setMyStream(null);
      }
      setChat((prev) => [
        ...prev,
        {
          text: "Partner disconnected. Searching...",
          isSystem: true,
        },
      ]);
      setRemoteStream(null);
      setRemoteId(null);
      peer.close();
      socket.emit("joinVideoRoom");
      setStatus("waiting");
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  }, [myStream, peer, socket]);

  useEffect(() => {
    const handleTrackEvent = (event) => {
      console.log("Received remote stream", event.streams[0]);
      setStatus("paired");
      setRemoteStream(event.streams[0]);
    };

    peer.addEventListener("track", handleTrackEvent);

    return () => {
      peer.removeEventListener("track", handleTrackEvent);
    };
  }, [peer]);

  // Replace the oniceconnectionstatechange with useEffect
  useEffect(() => {
    const handleIceConnectionStateChange = async () => {
      const state = peer.iceConnectionState;
      console.log("ICE Connection State:", state);
      setIceState(state);

      if (state === "connected" || state === "completed") {
        console.log("ICE state connected");
        setButtonText("End Call");
        setStatus("paired");
        sendStream();
        setReconnectionAttempts(0);
      } else if (state === "disconnected") {
        if (reconnectionAttempts < MAX_RETRIES) {
          setButtonText("End Call");
          console.log(`Restarting ICE... Attempt ${reconnectionAttempts + 1}`);
          setReconnectionAttempts(reconnectionAttempts + 1);
          try {
            // Create a new offer with ICE restart enabled
            const offer = await peer.createOffer({ iceRestart: true });
            await peer.setLocalDescription(offer);
            socket.emit("nego-call-user", { id: remoteId, offer });
          } catch (error) {
            console.error("Error restarting ICE:", error);
          }
        } else {
          socket.emit("endChat", room);
          peer.close();
          setRemoteStream(null);
          setRemoteId(null);
          socket.emit("joinVideoRoom");
        }
      } else if (state === "failed") {
        console.log("ICE connection failed, restarting...");
        socket.emit("joinVideoRoom");
        setRemoteStream(null);
        setRemoteId(null);
        if (myStream) {
          myStream.getTracks().forEach((track) => track.stop());
          setMyStream(null);
        }
        peer.close();
        setChat((prev) => [
          ...prev,
          {
            text: "Connection failed. Searching for new partner...",
            isSystem: true,
          },
        ]);
      }
    };

    peer.addEventListener(
      "iceconnectionstatechange",
      handleIceConnectionStateChange
    );
    return () => {
      peer.removeEventListener(
        "iceconnectionstatechange",
        handleIceConnectionStateChange
      );
    };
  }, [
    peer,
    sendStream,
    socket,
    myStream,
    remoteId,
    reconnectionAttempts,
    room,
  ]);

  const handleNegotiation = useCallback(async () => {
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
  }, [remoteId, createOffer, socket]);

  useEffect(() => {
    peer.addEventListener("negotiationneeded", handleNegotiation);

    return () => {
      peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  }, [peer, createOffer, socket, remoteId, handleNegotiation]);

  const handleNegoIncomingCall = useCallback(
    async (data) => {
      const { id, offer } = data;
      if (!offer) {
        handleNegotiation();
      }
      console.log("Nego Incoming call from:", id);
      try {
        console.log(offer);
        const ans = await createAnswer(offer);
        sendStream();
        socket.emit("nego-call-accepted", { id, ans });
      } catch (error) {
        console.error("Error creating answer:", error);
      }
    },
    [createAnswer, handleNegotiation, sendStream, socket]
  );

  useEffect(() => {
    socket.on("joined-room", handleRoomJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("nego-incoming-call", handleNegoIncomingCall);
    socket.on("nego-call-accepted", handleNegoCallAccepted);
    socket.on("partner-disconnected", handlePartnerDisconnected);

    return () => {
      socket.off("joined-room", handleRoomJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("nego-incoming-call", handleNegoIncomingCall);
      socket.off("nego-call-accepted", handleNegoCallAccepted);
      socket.off("partner-disconnected", handlePartnerDisconnected);
    };
  }, [
    socket,
    handleRoomJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoIncomingCall,
    handleNegoCallAccepted,
    handlePartnerDisconnected,
  ]);

  // Update handleCallEnded to stop tracks and reset state
  const handleCallEnded = () => {
    if (buttonText === "End Call") {
      setButtonText("really");
    } else if (buttonText === "really") {
      setButtonText("Start New Chat");
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
        setMyStream(null);
      }
      socket.emit("endChat", room);
      peer.close();
      setRemoteStream(null);
      setRemoteId(null);
    } else {
      setButtonText("End Call");
      setRemoteStream(null);
      setRemoteId(null);
      socket.emit("joinVideoRoom");
      setStatus("waiting");
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="flex h-full  p-4 space-x-4 relative">
        {/* Video Streams Section */}
        <div className="flex-1 flex flex-col space-y-4">
          {/* Remote Stream or Connecting Placeholder */}
          {remoteStream ? (
            <div className="relative bg-black rounded-xl lg:h-full h-2/3 overflow-hidden shadow-2xl border-2 border-cyan-400">
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
            </div>
          ) : (
            <div className="relative bg-black rounded-xl lg:h-full h-2/3 flex items-center justify-center shadow-2xl border-2 border-cyan-400">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mb-4"></div>
                <span className="text-cyan-400 text-sm">Connecting...</span>
              </div>
            </div>
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

        {showConfirmPopup && (
          <div className="fixed inset-0 p-7 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <p className="mb-4 text-gray-800">
                Are you sure you want to end the chat?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-md"
                  onClick={handleCallEnded}
                >
                  Yes
                </button>
                <button className="bg-gray-400 text-white px-4 py-2 rounded-md">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
      <div
        className={`absolute flex bottom-5 w-full justify-center text-white px-1 py-2 rounded transition-all duration-300 ${
          visible || buttonText === "Start New Chat"
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={handleCallEnded}
          className={`${
            buttonText === "Start New Chat" ? "bg-green-600" : "bg-red-700"
          } p-4 rounded-lg`}
        >
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  );
}

// Styles remain the same

export default Room;
