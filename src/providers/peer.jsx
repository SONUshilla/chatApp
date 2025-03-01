import React, { createContext, useEffect, useState, useContext } from "react";

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
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [peer, setPeer] = useState(() => new RTCPeerConnection(ICE_CONFIG));

  // Function to reinitialize Peer Connection properly
  const reinitializePeer = () => {
    console.warn("Reinitializing Peer Connection...");
    const newPeer = new RTCPeerConnection(ICE_CONFIG);
    setPeer(newPeer); // Ensure `peer` state is updated
    return newPeer;
  };


  const createOffer = async () => {
    try {
      if (isNegotiating) {
        console.warn("Already negotiating, skipping new offer.");
        return;
      }

      let currentPeer = peer;
      if (peer.signalingState === "closed") {
        console.warn(`Peer closed, reinitializing...`);
        currentPeer = reinitializePeer();
      }

      setIsNegotiating(true);
      const offer = await currentPeer.createOffer();
      await currentPeer.setLocalDescription(offer);
      console.log("Offer created:", offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
    } finally {
      setIsNegotiating(false);
    }
  };

  const createAnswer = async (offer) => {
    try {
      if (isNegotiating) {
        console.warn("Already negotiating, skipping answer creation.");
        return;
      }

      let currentPeer = peer;
      if (peer.signalingState === "closed") {
        console.warn(`Peer closed, reinitializing...`);
        currentPeer = reinitializePeer();
      }

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
      if (peer.signalingState !== "have-local-offer") {
        console.warn(
          `Peer not in expected state (have-local-offer), current state: ${peer.signalingState}`
        );
        return;
      }
      if (ans) {
        await peer.setRemoteDescription(ans);
      }
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  };

  return (
    <PeerContext.Provider
      value={{ peer, createOffer, createAnswer, setRemoteAns }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
