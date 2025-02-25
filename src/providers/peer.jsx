import React, { useMemo, createContext, useState,useEffect } from "react";

// Create Peer Context
const PeerContext = createContext(null);
export  const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = ({ children }) => {


  const peer = useMemo(
    () =>
      new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun.l.google.com:5349" },
          { urls: "stun:stun1.l.google.com:3478" },
          { urls: "stun:stun1.l.google.com:5349" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:5349" },
          { urls: "stun:stun3.l.google.com:3478" },
          { urls: "stun:stun3.l.google.com:5349" },
          { urls: "stun:stun4.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:5349" }
        ]
      }),
      
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
