import { Routes, Route } from "react-router-dom";
import { SocketProvider } from "./providers/socket";
import { PeerProvider } from "./providers/peer";
import HomePage from "./homepage";
import Room from "./room";
import Chat from "./chatRoom";
import { useState } from "react";

const App = () => {
  const [homeRoom,setHomeRoom]=useState(null);


  return (
    <SocketProvider>
      
        <Routes>
          <Route path="/" element=<HomePage homeRoom={homeRoom}/> />
          <Route path="/chatRoom" element=<Chat/> />
          <Route path="/videoRoom" element=<PeerProvider room={homeRoom}><Room setHomeRoom={setHomeRoom}/></PeerProvider> />
        </Routes>
      
    </SocketProvider>
  );
};

export default App;
