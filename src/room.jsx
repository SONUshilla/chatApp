import React, { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePeer } from "./providers/peer";
import { useSocket } from "./providers/socket";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";

function Room({ setHomeRoom }) {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteId, setRemoteId] = useState(null);
  const { createOffer, createAnswer, setRemoteAns, peer, addTrack, resetPeer } = usePeer();
  const [myStream, setMyStream] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("waiting");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const MAX_RETRIES = 3;
  const [visible, setVisible] = useState(true);
  const [callEnded, setCallEnded] = useState(false);
  const isPartnerDisconnected = useRef(false);

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

  // Auto-join room on mount
  useEffect(() => {
    socket.emit("joinVideoRoom");
  }, [socket]);

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
      setChat((prev) => [...prev, { text: data.message, isSystem: true }]);
    });

    return () => {
      socket.off("waiting");
      socket.off("roomJoined", handleRoom);
      socket.off("videoMessage");
      socket.off("notification");
      socket.emit("leaveQueue"); // Tell server we're leaving
    };
  }, [handleRoom, socket]); 

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && room) {
      socket.emit("sendVideoMessage", { room, message });
      setChat((prev) => [...prev, { text: message, isMe: true }]);
      setMessage("");
    }
  };

  const resetRoom = useCallback(() => {
    setRemoteStream(null);
    setRemoteId(null);
    setChat([]);
    setStatus("waiting");
    setShowConfirmPopup(false);
    isPartnerDisconnected.current = false;
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
      setMyStream(null);
    }
    // Correctly reset peer via provider
    resetPeer();
  }, [myStream, resetPeer]);

  const handleEndCall = () => {
    setShowConfirmPopup(true);
  };

  const confirmEndCall = useCallback(() => {
    socket.emit("endChat", room);
    resetRoom();
    socket.emit("joinVideoRoom");
  }, [room, socket, resetRoom]);

  // Stop Call: End chat, close connection, go to idle/home state
  const stopCall = useCallback(() => {
    socket.emit("endChat", room);
    setRemoteStream(null);
    setRemoteId(null);
    setChat([]);
    setStatus("idle");
    setCallEnded(true);
    setShowConfirmPopup(false);
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
      setMyStream(null);
    }
    resetPeer(); // Close peer properly
    navigate('/');
  }, [room, socket, myStream, resetPeer, navigate]);

  // Skip: End current chat and find next partner immediately
  const skipCall = useCallback(() => {
    if (status !== "disconnected") {
      socket.emit("endChat", room);
    }
    resetRoom();
    socket.emit("joinVideoRoom");
  }, [room, socket, resetRoom, status]);

  const cancelEndCall = () => {
    setShowConfirmPopup(false);
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

        // Add tracks immediately so they are included in the initial offer
        stream.getTracks().forEach((track) => {
             // Use addTrack from provider to ensure we target the active peer
             addTrack(track, stream);
        });

        console.log("Offer creation with tracks..."); // Log
        const offer = await createOffer();
        socket.emit("call-user", { id, offer });
        console.log("Offer sent to user:", id);
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    },
    [createOffer, socket, peer]
  );

  const sendStream = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((track) => {
        addTrack(track, myStream);
      });
    }
  }, [myStream, peer]);

  const handleIncomingCall = useCallback(
    async (data) => {
      const { id, offer } = data;
      if (!offer) {
          console.error("Incoming call received without offer, ignoring.");
          return;
      }
      console.log("Incoming call from:", id);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
        setRemoteId(id);

        // Add tracks immediately so they are included in the answer
        stream.getTracks().forEach((track) => {
             addTrack(track, stream);
        });

        const ans = await createAnswer(offer);
        socket.emit("call-accepted", { id, ans });
      } catch (error) {
        console.error("Error creating answer:", error);
      }
    },
    [createAnswer, socket, peer]
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

  const handlePartnerDisconnected = useCallback(async () => {
    try {
      console.log("Partner disconnected");
      isPartnerDisconnected.current = true;
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
        setMyStream(null);
      }
      setRemoteStream(null);
      setRemoteId(null);
      peer.close();
      // Disable auto-search:
      // socket.emit("joinVideoRoom"); 
      setStatus("disconnected"); 
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  }, [myStream, peer]);

  useEffect(() => {
    if (!peer) return; // Guard against null peer
    const handleTrackEvent = (event) => {
      console.log("TRACK EVENT FIRED", event);
      if (event.streams && event.streams[0]) {
          console.log("Received remote stream with id:", event.streams[0].id);
          console.log("Stream tracks:", event.streams[0].getTracks());
          setStatus("paired");
          setRemoteStream(event.streams[0]);
      } else {
          console.warn("Track event fired but no stream found!");
      }
    };

    peer.addEventListener("track", handleTrackEvent);

    return () => {
      peer.removeEventListener("track", handleTrackEvent);
    };
  }, [peer]);

  useEffect(() => {
    if (!peer) return; // Guard
    const handleIceConnectionStateChange = async () => {
      const state = peer.iceConnectionState;
      console.log("ICE Connection State:", state);
      
      if (state === "connected" || state === "completed") {
        console.log("ICE state connected");
        setStatus("paired");
        sendStream();
        setReconnectionAttempts(0);
      } else if (state === "disconnected") {
        if (!isPartnerDisconnected.current && reconnectionAttempts < MAX_RETRIES) {
          console.log(`Restarting ICE... Attempt ${reconnectionAttempts + 1}`);
          setReconnectionAttempts(prev => prev + 1);
          try {
            const offer = await peer.createOffer({ iceRestart: true });
            await peer.setLocalDescription(offer);
            // Need remoteId here. If disconnected, we might still have it.
            if (remoteId) {
                socket.emit("nego-call-user", { id: remoteId, offer });
            }
          } catch (error) {
            console.error("Error restarting ICE:", error);
          }
        } else {
          // Max retries reached, end call
          confirmEndCall();
        }
      } else if (state === "failed") {
        console.log("ICE connection failed, restarting...");
        if (!isPartnerDisconnected.current) {
             confirmEndCall(); 
        }
      }
    };

    peer.addEventListener("iceconnectionstatechange", handleIceConnectionStateChange);
    return () => {
      peer.removeEventListener("iceconnectionstatechange", handleIceConnectionStateChange);
    };
  }, [peer, sendStream, socket, remoteId, reconnectionAttempts, confirmEndCall]);

  const handleNegotiation = useCallback(async () => {
    if (!peer) return; // Guard
    try {
      if (!remoteId) {
        console.log("Remote ID not set, skipping negotiation.");
        return;
      }
      // Critical Check: Don't negotiate if we are already in the middle of a handshake (e.g. initial call)
      // This prevents the "stuck at creating offer" bug caused by addTrack triggering this event prematurely.
      if (peer.signalingState !== "stable") {
         console.log("Signaling state not stable, skipping auto-negotiation.");
         return;
      }

      console.log("Negotiation needed, creating offer...");
      const offer = await createOffer();
      socket.emit("nego-call-user", { id: remoteId, offer });
    } catch (error) {
      console.error("Error during negotiation:", error);
    }
  }, [remoteId, createOffer, socket, peer]);

  useEffect(() => {
    if (!peer) return; // Guard
    peer.addEventListener("negotiationneeded", handleNegotiation);
    return () => {
      peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  }, [peer, createOffer, socket, remoteId, handleNegotiation]);

  const handleNegoIncomingCall = useCallback(
    async (data) => {
      const { id, offer } = data;
      if (!offer) {
        // If no offer, maybe we initiated? Logic here seems to handle both sides?
        // Actually usually negotiation incoming implies an offer is present.
        // User code line 302: handleNegotiation(); ??
        // If incoming negotiaton has no offer, something is wrong or it's a diff protocol.
        // Assuming offer is present.
      }
      console.log("Nego Incoming call from:", id);
      try {
        const ans = await createAnswer(offer);
        // sendStream(); // Should be sending already?
        socket.emit("nego-call-accepted", { id, ans });
      } catch (error) {
        console.error("Error creating answer:", error);
      }
    },
    [createAnswer, socket]
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

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row h-full p-2 lg:p-4 gap-4 relative overflow-hidden">
        {/* Video Streams Section */}
        <div className="flex-1 flex flex-col relative w-full h-full rounded-2xl overflow-hidden">
          {/* Remote Stream or Connecting Placeholder */}
          {remoteStream ? (
            <div className="relative w-full h-full bg-black">
              <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-cyan-400 text-sm z-10 backdrop-blur-sm border border-cyan-400/30">
                Partner
              </div>
              <ReactPlayer
                playing
                playsinline // Vital for mobile
                url={remoteStream}
                width="100%"
                height="100%"
                className="bg-black"
                style={{ backgroundColor: 'black', objectFit: 'cover' }}
                onError={(e) => console.error("ReactPlayer Error:", e)}
              />
            </div>
          ) : status === "idle" ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black/90 backdrop-blur-sm">
               <div className="text-center">
                  <h3 className="text-white text-xl mb-4 font-bold">Call Ended</h3>
                  <button 
                    onClick={() => { socket.emit("joinVideoRoom"); setStatus("waiting"); setCallEnded(false); }}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
                  >
                    Start New Chat
                  </button>
                </div>
            </div>
          ) : status === "disconnected" ? (
            <div className="relative bg-black rounded-xl lg:h-full h-2/3 flex items-center justify-center shadow-2xl border-2 border-orange-500/50">
               <div className="text-center p-8">
                  <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-2xl mb-2 font-bold">Partner Disconnected</h3>
                  <p className="text-gray-400 mb-8">The remote user has left the chat.</p>
                  
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <button 
                      onClick={skipCall}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Find New Partner
                    </button>
                    <button 
                      onClick={stopCall}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Exit to Home
                    </button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-900/20">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mb-4"></div>
                <span className="text-cyan-400 text-sm">
                   {status === "waiting" ? "Searching for partner..." : "Connecting..."}
                </span>
              </div>
            </div>
          )}

          {/* Local Stream - PiP */}
          {myStream && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.1}
              // Mobile: Bottom-right (above footer), Desktop: Bottom-right
              className="absolute bottom-28 right-4 w-28 h-40 sm:w-32 sm:h-48 lg:bottom-8 lg:right-8 lg:w-64 lg:h-48 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500/50 z-20 cursor-move hover:border-purple-400 transition-colors"
            >
              <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded-full text-purple-400 text-[10px] lg:text-xs z-20 backdrop-blur-sm font-medium">
                You
              </div>
              <ReactPlayer
                playing
                muted
                url={myStream}
                width="100%"
                height="100%"
                className="scale-x-[-1]" // Mirror local video
                style={{ backgroundColor: 'black', objectFit: 'cover' }}
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
              className="absolute inset-0 lg:relative lg:inset-auto lg:w-96 bg-gray-900/95 lg:bg-black/40 backdrop-blur-xl lg:rounded-2xl border-l lg:border border-cyan-400/20 shadow-2xl z-30 flex flex-col"
            >
              <div className="p-4 border-b border-cyan-400/20 flex justify-between items-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Chat Room
                </h2>
                <button 
                  onClick={() => setShowChat(false)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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
                          ? "bg-cyan-400/20 text-cyan-400 text-center text-xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4 text-center"
            >
              <h3 className="text-xl font-bold text-white mb-4">End Call?</h3>
              <p className="text-gray-400 mb-8">What would you like to do next?</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={skipCall}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 group"
                >
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Skip & Find New Partner
                </button>
                
                <button
                  onClick={stopCall}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stop & Exit
                </button>

                <button
                  onClick={cancelEndCall}
                  className="mt-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold"
                >
                  Cancel (Return to Call)
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Chat Toggle Button - Mobile Position adjusted */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="absolute top-4 right-4 lg:top-6 lg:right-6 w-10 h-10 lg:w-12 lg:h-12 bg-cyan-400/20 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-cyan-400/30 transition-colors shadow-2xl border border-cyan-400/30 z-30"
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
      
      {/* Footer Controls */}
      {status !== "disconnected" && status !== "idle" && !showChat && (
        <div
          className={`fixed bottom-6 left-0 right-0 px-4 flex justify-center lg:absolute lg:bottom-8 lg:left-1/2 lg:right-auto lg:transform lg:-translate-x-1/2 lg:w-auto transition-all duration-300 z-40 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
          }`}
        >
          <button
            onClick={handleEndCall}
            className="w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm lg:text-base"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
            {status === "waiting" ? "Stop Searching" : "End Call"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Room;
