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
      if(peer.signalingState==="closed")
      {
        console.warn(
          `Peer not in stable state (${peer.signalingState}). Reinitializing...`
        );
        const newpeer=reinitializePeer();
        const offer = await newpeer.createOffer();
        await newpeer.setLocalDescription(offer);
        return offer;
      }
      setIsNegotiating(true);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log("offer is created successfully",offer);
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
      if (peer.signalingState === "closed") {
        console.warn(
          `Peer not in stable state (${peer.signalingState}) before setting remote offer. Reinitializing...`
        );
        const newpeer=reinitializePeer();
        await newpeer.setRemoteDescription(offer);
        const answer = await newpeer.createAnswer();
        await newpeer.setLocalDescription(answer);
        return answer;
      }
      setIsNegotiating(true);
      console.log("this is pffer", offer);
      if (offer && offer.sdp && offer.type) {
        await peer.setRemoteDescription(offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        return answer;
      } else {
        console.error("Invalid offer received, cannot create answer.");
        return;
      }
      
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
      if(ans)
        {
      await peer.setRemoteDescription(ans);
        }
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
