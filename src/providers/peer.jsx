import React, { useMemo, createContext, useState,useEffect } from "react";

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
}


// Create Peer Context
const PeerContext = createContext(null);
export  const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = ({ children }) => {


  const peer = useMemo(
    () =>
      new RTCPeerConnection(ICE_CONFIG
      ),
      
    []
  );
  

  const createOffer = async()=> {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(new RTCSessionDescription(offer));
    return offer;
  }
  const createAnswer =async (offer) =>{
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer;
  }
  const setRemoteAns = async (ans) =>{
    await peer.setRemoteDescription(new RTCSessionDescription(ans));
  }


  
  

  

  return (
    <PeerContext.Provider value={{peer, createOffer,createAnswer,setRemoteAns}}>
      {children}
    </PeerContext.Provider>
  );
};

