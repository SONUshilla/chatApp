import React, { useCallback, useEffect, useState } from "react";
import { usePeer } from "./providers/peer";
import { useSocket } from "./providers/socket";
import ReactPlayer from "react-player";

function Room() {
  const { socket } = useSocket();
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteId, setRemoteId] = useState(null);
  const { createOffer, createAnswer, setRemoteAns, peer } = usePeer();
  const [myStream, setMyStream] = useState(null);

  const handleRoomJoined = useCallback(
    async (data) => {
      const { id } = data;
      setRemoteId(id);
      console.log("Room joined, creating offer...");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
  
        const offer = await createOffer();
        socket.emit("call-user", { id, offer });
        console.log("Offer sent to user:", id);
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    },
    [createOffer, socket]
  );
  const sendStream = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((track) => {
        peer.addTrack(track, myStream);
      });
    }
  }, [myStream, peer]);

  const handleIncomingCall = useCallback(
    async (data) => {
      const { id, offer } = data;
      console.log("Incoming call from:", id);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
        setRemoteId(id);
        const ans = await createAnswer(offer);
        socket.emit("call-accepted", { id, ans });
      } catch (error) {
        console.error("Error creating answer:", error);
      }
    },
    [createAnswer, socket]
  );

  const handleCallAccepted = useCallback(
    async (data) => {
      const { ans } = data;
      try {
        await setRemoteAns(ans);
    
        console.log("Call accepted, connection established.");
      } catch (error) {
        console.error("Error setting remote answer:", error);
      }
    },
    [setRemoteAns]
  );

  useEffect(() => {
    const handleTrackEvent = (event) => {
      console.log("Received remote stream", event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    peer.addEventListener("track", handleTrackEvent);

    return () => {
      peer.removeEventListener("track", handleTrackEvent);
    };
  }, [peer]);

  useEffect(() => {
    const handleNegotiation = async () => {
      try {
        if (!remoteId) {
          console.log("Remote ID not set, skipping negotiation.");
          return;
        }
        console.log("Negotiation needed, creating offer...");
        const offer = await createOffer();
        socket.emit("call-user", { id: remoteId, offer });
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    peer.addEventListener("negotiationneeded", handleNegotiation);

    return () => {
      peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  }, [peer, createOffer, socket, remoteId]);


  
  useEffect(() => {
    socket.on("joined-room", handleRoomJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);

    return () => {
      socket.off("joined-room", handleRoomJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
    };
  }, [socket, handleRoomJoined, handleIncomingCall, handleCallAccepted]);

  return (

    <div style={styles.container}>
    {remoteId && <button onClick={()=>{}}>Send stream </button>}
      {myStream && (
        <div style={styles.videoWrapper}>
          <p style={styles.label}>My Stream</p>
          <ReactPlayer playing muted url={myStream} style={styles.video} />
        </div>
      )}

      {remoteStream && (
        <div style={styles.videoWrapper}>
          <p style={styles.label}>Remote Stream</p>
          <ReactPlayer
            playing
            url={remoteStream}
            width="320px"
            height="180px"
            style={styles.video}
          />
        </div>
      )}
    </div>
  );
}

// Styles remain the same

export default Room;

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    padding: "20px",
    flexWrap: "wrap",
    backgroundColor: "#f4f4f4",
    borderRadius: "10px",
  },
  videoWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    border: "2px solid #ddd",
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "#fff",
    padding: "10px",
    boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
  },
  video: {
    width: "320px",
    height: "180px",
    borderRadius: "5px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "5px",
  },
};
