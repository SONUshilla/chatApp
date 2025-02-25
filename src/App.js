import { Routes, Route } from "react-router-dom";
import { SocketProvider } from "./providers/socket";
import { PeerProvider } from "./providers/peer";
import HomePage from "./homepage";
import Room from "./room";

const App = () => {
  return (
    <SocketProvider>
      <PeerProvider>
        <Routes>
          <Route path="/" element=<HomePage /> />
          <Route path="/room/:roomId" element=<Room/> />
        </Routes>
      </PeerProvider>
    </SocketProvider>
  );
};

export default App;
