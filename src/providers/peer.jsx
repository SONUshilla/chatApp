import React, { createContext, useEffect, useRef, useContext } from "react";

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

export const PeerProvider = ({ children }) => {
  const peerRef = useRef(new RTCPeerConnection(ICE_CONFIG));
  const isNegotiatingRef = useRef(false);

  const reinitializePeer = () => {
    peerRef.current.close();
    const newPeer = new RTCPeerConnection(ICE_CONFIG);
    setupPeerEvents(newPeer);
    peerRef.current = newPeer;
    return newPeer;
  };

  const setupPeerEvents = (peer) => {
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE Candidate:", event.candidate);
      }
    };
  };

  useEffect(() => {
    setupPeerEvents(peerRef.current);
    return () => peerRef.current.close();
  }, []);

  const createOffer = async () => {
    try {
      if (isNegotiatingRef.current) return;
      isNegotiatingRef.current = true;

      let currentPeer = peerRef.current;
      if (currentPeer.signalingState === "closed") {
        currentPeer = reinitializePeer();
      }

      const offer = await currentPeer.createOffer();
      await currentPeer.setLocalDescription(offer);
      return offer;
    } finally {
      isNegotiatingRef.current = false;
    }
  };

  const createAnswer = async (offer) => {
    try {
      if (isNegotiatingRef.current) return;
      isNegotiatingRef.current = true;

      let currentPeer = peerRef.current;
      if (currentPeer.signalingState === "closed") {
        currentPeer = reinitializePeer();
      }

      await currentPeer.setRemoteDescription(offer);
      const answer = await currentPeer.createAnswer();
      await currentPeer.setLocalDescription(answer);
      return answer;
    } finally {
      isNegotiatingRef.current = false;
    }
  };

  const setRemoteAns = async (ans) => {
    try {
      await peerRef.current.setRemoteDescription(ans);
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  };

  return (
    <PeerContext.Provider
      value={{
        peer: peerRef.current,
        createOffer,
        createAnswer,
        setRemoteAns
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};