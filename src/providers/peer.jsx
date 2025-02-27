import React, { createContext, useState } from "react";

// Define your ICE configuration in a constant to reuse
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
export const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = ({ children }) => {
  // Use state so we can update the peer when necessary
  const [peer, setPeer] = useState(new RTCPeerConnection(ICE_CONFIG));
  // Lock to avoid overlapping negotiations
  const [isNegotiating, setIsNegotiating] = useState(false);

  // Function to clean up and reinitialize the peer connection
  const reinitializePeer = () => {
    if (peer && peer.signalingState !== "closed") {
      // Clean up: Close the connection
      peer.close();
    }
    const newPeer = new RTCPeerConnection(ICE_CONFIG);
    setPeer(newPeer);
    return newPeer;
  };

  const createOffer = async () => {
    try {
      if (isNegotiating) {
        console.warn("Already negotiating, skipping new offer.");
        return;
      }
      // Check that the connection is in a stable state
      if (peer.signalingState !== "stable") {
        console.warn(
          `Peer not in stable state (${peer.signalingState}). Reinitializing...`
        );
        reinitializePeer();
      }
      setIsNegotiating(true);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
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
      // Expect the peer to be in a stable state before receiving an offer.
      if (peer.signalingState !== "stable") {
        console.warn(
          `Peer not in stable state (${peer.signalingState}) before setting remote offer. Reinitializing...`
        );
        reinitializePeer();
      }
      setIsNegotiating(true);
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error("Error creating answer:", error);
      throw error;
    } finally {
      setIsNegotiating(false);
    }
  };

  const setRemoteAns = async (ans) => {
    try {
      // When setting a remote answer, the signaling state should be "have-local-offer"
      if (peer.signalingState !== "have-local-offer") {
        console.warn(
          `Peer not in the expected state (have-local-offer) to set remote answer. Current state: ${peer.signalingState}`
        );
        return;
      }
      await peer.setRemoteDescription(ans);
    } catch (error) {
      console.error("Error setting remote description:", error);
      throw error;
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
