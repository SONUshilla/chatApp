import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "./providers/socket";
import { useEffect, useState } from "react";

const HomePage = ({homeRoom}) => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    // Listen for the total users update
    socket.on("updateTotalUsers", (count) => {
      setTotalUsers(count);
    });

    return () => {
      socket.off("updateTotalUsers");
    };
  }, [socket]);


  const location = useLocation();
  useEffect(() => {
   
    socket.emit("endChat", homeRoom);

  }, [homeRoom, location.pathname, socket]); // Runs when the pathname changes

  const handleJoinChatRoom = () => {
    socket.emit("joinChatRoom");
    navigate(`/chatRoom`);
  };

  const handleJoinVideoRoom = () => {
    socket.emit("joinVideoRoom");
    navigate(`/videoRoom/`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
         {/* Floating online users count */}
         <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/60 p-3 rounded-full border-4 border-green-500 text-green-500 font-bold shadow-lg animate-pulse">
  Online Users: {totalUsers}
</div>

      <h1 className="text-4xl font-bold mb-8">Welcome</h1>
      <p className="text-lg mb-4">Join a random Chat or Video room:</p>
      <div className="flex gap-4">
        <button
          onClick={handleJoinChatRoom}
          className="px-6 py-3 font-semibold text-white bg-green-500 rounded-md transition hover:bg-green-600"
        >
          Join Chat Room
        </button>
        <button
          onClick={handleJoinVideoRoom}
          className="px-6 py-3 font-semibold text-white bg-blue-500 rounded-md transition hover:bg-blue-600"
        >
          Join Video Room
        </button>
      </div>
    </div>
  );
};

export default HomePage;