import React, { createContext, useState, useRef, useEffect } from "react";

// Define your ICE configuration to reuse
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

/*
  In this implementation, we add:
  - a 'polite' flag to designate whether this peer should yield on collisions.
  - a 'makingOffer' state to track if we are in the process of creating an offer.
  - an onnegotiationneeded handler for automatic outbound negotiation.
  - collision handling in createAnswer: if we detect a collision
    (i.e. if we’re making an offer or the connection isn’t stable),
    an impolite peer will ignore the incoming offer, while a polite peer
    can choose to handle it (e.g. by rolling back its own negotiation).
*/

export const PeerProvider = ({ children, polite = false }) => {
  // Create a new RTCPeerConnection and hold it in state
  const [peer, setPeer] = useState(new RTCPeerConnection(ICE_CONFIG));
  // Lock to avoid overlapping negotiations
  const [isNegotiating, setIsNegotiating] = useState(false);
  // Track if we are currently making an offer
  const [makingOffer, setMakingOffer] = useState(false);
  // Ref to optionally ignore an incoming offer if collision occurs
  const ignoreOfferRef = useRef(false);

  // Function to reinitialize the peer connection if needed
  const reinitializePeer = () => {
    const newPeer = new RTCPeerConnection(ICE_CONFIG);
    setPeer(newPeer);
    return newPeer;
  };

  // Automatically handle negotiation-needed events (outbound offers)
  useEffect(() => {
    if (!peer) return;

    const handleNegotiationNeeded = async () => {
      try {
        setMakingOffer(true);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        console.log("Negotiation needed, created offer:", offer);
        // Send the offer over your signaling channel here.
      } catch (error) {
        console.error("Error during negotiationneeded:", error);
      } finally {
        setMakingOffer(false);
      }
    };

    peer.onnegotiationneeded = handleNegotiationNeeded;

    // Cleanup
    return () => {
      peer.onnegotiationneeded = null;
    };
  }, [peer]);

  // Externally callable createOffer (if needed)
  const createOffer = async () => {
    if (isNegotiating || makingOffer) {
      console.warn("Already negotiating, skipping new offer.");
      return;
    }
    if (peer.signalingState === "closed") {
      console.warn(`Peer not in stable state (${peer.signalingState}). Reinitializing...`);
      const newPeer = reinitializePeer();
      const offer = await newPeer.createOffer();
      await newPeer.setLocalDescription(offer);
      console.log("Offer created with reinitialized peer:", offer);
      return offer;
    }
    setIsNegotiating(true);
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log("Offer is created successfully", offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    } finally {
      setIsNegotiating(false);
    }
  };

  // createAnswer implements collision handling per perfect negotiation.
  const createAnswer = async (offer) => {
    if (!offer) {
      console.error("No valid offer provided to createAnswer.");
      return;
    }
    // Detect collision: if we're making an offer or the connection isn't stable
    const collision = makingOffer || (peer.signalingState !== "stable");
    if (collision) {
      if (!polite) {
        console.warn("Collision detected and I'm impolite. Ignoring incoming offer.");
        ignoreOfferRef.current = true;
        return;
      } else {
        console.warn("Collision detected but I'm polite. Handling the collision gracefully.");
        // A polite peer might choose to roll back its own negotiation here.
        // For example, you might reset the connection state or wait until the collision clears.
      }
    }
    setIsNegotiating(true);
    try {
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      console.log("Answer created successfully", answer);
      return answer;
    } catch (error) {
      console.error("Error creating answer:", error);
      throw error;
    } finally {
      setIsNegotiating(false);
    }
  };

  // Function to set remote answer, expected only when we have a local offer
  const setRemoteAns = async (ans) => {
    try {
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
      value={{ peer, createOffer, createAnswer, setRemoteAns, polite }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
