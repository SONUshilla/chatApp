import React, { createContext, useEffect, useState, useContext, useCallback } from "react";
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
  const [peer, setPeer] = useState(() => new RTCPeerConnection(ICE_CONFIG));
  const { socket } = useSocket();

  const sendCandidate = useCallback((candidate) => {
    socket.emit("ice-candidate",{ room,candidate});
  },[room, socket]);
  

  // Listen for ICE Candidates from the server
  useEffect(() => {
    socket.on("ice-candidate", (candidate) => {
      console.log("Received ICE Candidate:", candidate);
      peer.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => socket.off("ice-candidate");
  }, [peer, socket]);

  const setupPeerEvents = (peer, sendCandidate) => {
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE Candidate:", event.candidate);
        sendCandidate(event.candidate); // Send ICE candidate to signaling server
      }
    };
  };

  const reinitializePeer = () => {
    console.warn("Reinitializing Peer Connection...");
    const newPeer = new RTCPeerConnection(ICE_CONFIG);
    setupPeerEvents(newPeer, sendCandidate);
    setPeer(newPeer);
    return newPeer;
  };

  useEffect(() => {
    setupPeerEvents(peer, sendCandidate);
    return () => peer.close();
  }, [peer, sendCandidate]);

  const createOffer = async () => {
    try {
      if (isNegotiating) return;
      let currentPeer = peer;
      if (peer.signalingState === "closed") currentPeer = reinitializePeer();

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
      if (isNegotiating) return;
      let currentPeer = peer;
      if (peer.signalingState === "closed") currentPeer = reinitializePeer();

      setIsNegotiating(true);
      await currentPeer.setRemoteDescription(offer);
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
      if (ans) await peer.setRemoteDescription(ans);
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  };



  return (
    <PeerContext.Provider value={{ peer, createOffer, createAnswer, setRemoteAns }}>
      {children}
    </PeerContext.Provider>
  );
};


export default PeerProvider;
