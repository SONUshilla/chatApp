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

  // Function to reinitialize the peer connection
  const reinitializePeer = () => {
    const newPeer = new RTCPeerConnection(ICE_CONFIG);
    setPeer(newPeer);
    return newPeer;
  };

  const createOffer = async () => {
    // Check if the current peer is closed
    let currentPeer = peer;
    if (peer.signalingState === "closed") {
      console.warn("Peer connection closed. Reinitializing...");
      currentPeer = reinitializePeer();
    }
    const offer = await currentPeer.createOffer();
    await currentPeer.setLocalDescription(offer);
    return offer;
  };

  const createAnswer = async (offer) => {
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  };

  const setRemoteAns = async (ans) => {
    await peer.setRemoteDescription(ans);
  };

  return (
    <PeerContext.Provider value={{ peer, createOffer, createAnswer, setRemoteAns }}>
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
