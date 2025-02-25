import {  useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "./providers/socket";

const HomePage = () => {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();
  const {socket} =useSocket();



  const handleJoinRoom = () => {
    if (!roomId.trim()) return;

    // Emit event with correct roomId
    socket.emit("joinRoom", roomId);

    // Navigate to the room page
    navigate(`/room/${roomId}`);
  };

  return (
    <div>
      <h1>Enter Room ID</h1>
      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button onClick={handleJoinRoom}>Join Room</button>
    </div>
  );
};

export default HomePage;
