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

  // Function to reinitialize the Peer Connection by closing the current one
  const reinitializePeer = () => {
    console.warn("Reinitializing Peer Connection...");
    if (peer) {
      peer.close();
    }
    const newPeer = new RTCPeerConnection(ICE_CONFIG);
    setPeer(newPeer);
    return newPeer;
  };

  // Helper to wait until ICE gathering is complete
  const waitForIceCandidates = async (currentPeer) => {
    return new Promise((resolve) => {
      if (currentPeer.iceGatheringState === "complete") {
        resolve();
      } else {
        // Preserve any existing handler if needed.
        currentPeer.onicegatheringstatechange = () => {
          if (currentPeer.iceGatheringState === "complete") {
            currentPeer.onicegatheringstatechange = null;
            resolve();
          }
        };
      }
    });
  };

  const createOffer = async () => {
    try {
      if (isNegotiating) {
        console.warn("Already negotiating, skipping new offer.");
        return;
      }

      let currentPeer = peer;
      if (peer.signalingState === "closed") {
        console.warn("Peer closed, reinitializing...");
        currentPeer = reinitializePeer();
      }

      setIsNegotiating(true);
      const offer = await currentPeer.createOffer();
      await currentPeer.setLocalDescription(offer);
      console.log("Offer created:", offer);

      // Wait for ICE candidates to be gathered
      await waitForIceCandidates(currentPeer);
      console.log("Final Offer with ICE candidates:", currentPeer.localDescription);

      return currentPeer.localDescription;
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
        console.warn("Peer closed, reinitializing...");
        currentPeer = reinitializePeer();
      }

      setIsNegotiating(true);
      await currentPeer.setRemoteDescription(offer);
      const answer = await currentPeer.createAnswer();
      await currentPeer.setLocalDescription(answer);
      console.log("Answer created:", answer);

      // Wait for ICE candidates to be gathered
      await waitForIceCandidates(currentPeer);
      console.log("Final Answer with ICE candidates:", currentPeer.localDescription);

      return currentPeer.localDescription;
    } catch (error) {
      console.error("Error creating answer:", error);
    } finally {
      setIsNegotiating(false);
    }
  };

  const setRemoteAns = async (ans) => {
    try {
      if (ans) {
        await peer.setRemoteDescription(ans);
      }
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  };

  // Attach ICE candidate logging whenever the peer changes.
  useEffect(() => {
    if (!peer) return;

    const handleIceCandidate = (event) => {
      if (event.candidate) {
        console.log("ICE Candidate:", event.candidate);
      }
    };

    peer.onicecandidate = handleIceCandidate;

    return () => {
      peer.onicecandidate = null;
    };
  }, [peer]);

  return (
    <PeerContext.Provider
      value={{ peer, createOffer, createAnswer, setRemoteAns }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
