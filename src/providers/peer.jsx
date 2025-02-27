import React, { useMemo, createContext, useState,useEffect } from "react";

// Create Peer Context
const PeerContext = createContext(null);
export  const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = ({ children }) => {


  const peer = useMemo(
    () =>
      new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }, // Fastest STUN
          { urls: "stun:global.stun.twilio.com:3478" }, // Extra STUN for backup
          {
            urls: "turn:relay1.expressturn.com",
            username: "efilter",
            credential: "efilter",
          }, // Free TURN server (limited use)
          {
            urls: "turn:numb.viagenie.ca",
            username: "webrtc@live.com",
            credential: "muazkh",
          }, // Another free TURN server (may be slow)
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
