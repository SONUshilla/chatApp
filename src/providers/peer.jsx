import React, { useMemo, createContext, useState,useEffect } from "react";

// Create Peer Context
const PeerContext = createContext(null);
export  const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = ({ children }) => {


  const peer = useMemo(
    () =>
      new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }, // Google STUN for fast NAT traversal
  
          {
            urls: "turn:relay1.expressturn.com:3478",
            username: "efLJ3KCRYOU1FDA7QD",
            credential: "ZZHlXOfsINKMXOlZ",
          },
        ],
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
