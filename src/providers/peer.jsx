import React, { createContext, useEffect, useState, useContext, useCallback, useRef } from "react";
import { useSocket } from "./socket";


// ICE Configuration
const ICE_CONFIG = {
  iceServers: [
    
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "4746e4806424ee775cae0eb7",
      credential: "fWtNeHJsCEzLoTaK",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "4746e4806424ee775cae0eb7",
      credential: "fWtNeHJsCEzLoTaK",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "4746e4806424ee775cae0eb7",
      credential: "fWtNeHJsCEzLoTaK",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "4746e4806424ee775cae0eb7",
      credential: "fWtNeHJsCEzLoTaK",
    },
  ],
};

const PeerContext = createContext(null);
export const usePeer = () => useContext(PeerContext);

export const PeerProvider = ({ children,room }) => {
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [peerState, setPeerState] = useState(null); // Just for causing re-renders if needed
  const peerRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const { socket } = useSocket();

  const getPeer = () => {
    if (!peerRef.current || peerRef.current.signalingState === "closed") {
       console.warn("Reinitializing Peer Connection (getPeer)...");
       const newPeer = new RTCPeerConnection(ICE_CONFIG);
       setupPeerEvents(newPeer, sendCandidate);
       peerRef.current = newPeer;
       setPeerState(newPeer); // Trigger re-render
       return newPeer;
    }
    return peerRef.current;
  };

  // Initialize on mount
  useEffect(() => {
    if (!peerRef.current) {
        getPeer();
    }
    return () => {
        // Cleanup on unmount
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
    };
  }, []);

  const resetPeer = useCallback(() => {
      console.log("Resetting Peer Connection...");
      if (peerRef.current) {
          peerRef.current.close();
      }
      peerRef.current = new RTCPeerConnection(ICE_CONFIG);
      setupPeerEvents(peerRef.current, sendCandidate);
      iceCandidatesQueue.current = []; // Clear queue
      setPeerState(peerRef.current);
      return peerRef.current;
  }, []);

  const roomRef = useRef(room);

  // Keep roomRef updated
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const setupPeerEvents = (peer, sendCandidate) => {
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE Candidate:", event.candidate);
        sendCandidate(event.candidate); 
      }
    };
  };

  const sendCandidate = useCallback((candidate) => {
    // Navigate safely: use the ref to get the current room
    if (roomRef.current) {
        socket.emit("ice-candidate",{ room: roomRef.current, candidate});
    } else {
        console.warn("Attempted to send ICE candidate with no room ID");
    }
  }, [socket]);
  
  const processIceQueue = async (currentPeer) => {
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      try {
        await currentPeer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding queued ICE candidate:", e);
      }
    }
  };

  // Listen for ICE Candidates
  useEffect(() => {
    socket.on("ice-candidate", async (candidate) => {
      console.log("Received ICE Candidate:", candidate);
      const currentPeer = peerRef.current;
      if (!currentPeer || currentPeer.signalingState === "closed") {
        console.warn("Peer connection closed, ignoring ICE candidate");
        return;
      }
      
      if (!currentPeer.remoteDescription) {
        console.log("Queueing ICE candidate (no remote description)");
        iceCandidatesQueue.current.push(candidate);
        return;
      }
      try {
        await currentPeer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    });

    return () => socket.off("ice-candidate");
  }, [socket]);

  const addTrack = useCallback((track, stream) => {
      const currentPeer = getPeer();
      const senderExists = currentPeer.getSenders().some((sender) => sender.track === track);
      if (!senderExists) {
          console.log("Adding track to peer:", track.kind);
          currentPeer.addTrack(track, stream);
      } else {
          console.log("Track already exists, skipping add:", track.kind);
      }
  }, []);

  const createOffer = async () => {
    try {
      if (isNegotiating) {
          console.warn("Already negotiating, careful with createOffer");
      }
      const currentPeer = getPeer();

      setIsNegotiating(true);
      const offer = await currentPeer.createOffer();
      await currentPeer.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
    } finally {
      setIsNegotiating(false);
    }
  };

  const createAnswer = async (offer) => {
    try {
      if (!offer) {
          console.error("createAnswer called with null offer");
          return;
      }
      const currentPeer = getPeer();

      setIsNegotiating(true);
      await currentPeer.setRemoteDescription(offer);
      await processIceQueue(currentPeer);
      const answer = await currentPeer.createAnswer();
      await currentPeer.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error("Error creating answer:", error);
    } finally {
      setIsNegotiating(false);
    }
  };

  const setRemoteAns = async (ans) => {
    try {
      if (ans) {
          const currentPeer = getPeer();
          await currentPeer.setRemoteDescription(ans);
          await processIceQueue(currentPeer);
      }
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  };

  return (
    <PeerContext.Provider value={{ peer: peerState || peerRef.current, createOffer, createAnswer, setRemoteAns, addTrack, resetPeer }}>
      {children}
    </PeerContext.Provider>
  );
};


export default PeerProvider;
