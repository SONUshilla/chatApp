import { Routes, Route } from "react-router-dom";
import { SocketProvider } from "./providers/socket";
import { PeerProvider } from "./providers/peer";
import HomePage from "./homepage";
import Room from "./room";
import Chat from "./chatRoom";

const App = () => {
  return (
    <SocketProvider>
      
        <Routes>
          <Route path="/" element=<HomePage /> />
          <Route path="/chatRoom" element=<Chat/> />
          <Route path="/videoRoom" element=<PeerProvider><Room/></PeerProvider> />
        </Routes>
      
    </SocketProvider>
  );
};

export default App;
