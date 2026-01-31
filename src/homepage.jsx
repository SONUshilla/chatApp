import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "./providers/socket";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const HomePage = ({ homeRoom }) => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
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
  }, [homeRoom, location.pathname, socket]);

  const handleJoinChatRoom = () => {
    socket.emit("joinChatRoom");
    navigate(`/chatRoom`);
  };

  const handleJoinVideoRoom = () => {
    socket.emit("joinVideoRoom");
    navigate(`/videoRoom/`);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 -z-10">
         <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      {/* Hero Content */}
      <div className="text-center px-4 z-10 max-w-5xl mx-auto">
        
        {/* Live User Count */}
         <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 inline-flex items-center space-x-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-green-500/30"
         >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-400 font-mono font-bold text-sm tracking-wide">
              {totalUsers} online now
            </span>
         </motion.div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-6xl md:text-8xl font-black mb-6 tracking-tight leading-tight"
        >
          Talk to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500">
            Strangers.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto"
        >
          Instant connections. No registration. Complete anonymity. 
          The modern way to meet new people from around the world.
        </motion.p>

        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5 }}
           className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          <button
            onClick={handleJoinVideoRoom}
            className="group relative px-8 py-4 bg-white text-black text-lg font-bold rounded-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-cyan-500/20"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <span className="flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
               </svg>
               Video Chat
            </span>
          </button>

          <button
            onClick={handleJoinChatRoom}
            className="group relative px-8 py-4 bg-transparent border-2 border-white/20 text-white text-lg font-bold rounded-lg overflow-hidden transition-all hover:bg-white/10 hover:border-white/40 active:scale-95"
          >
            <span className="flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
               </svg>
               Text Chat
            </span>
          </button>
        </motion.div>
      </div>

    </div>
  );
};

export default HomePage;