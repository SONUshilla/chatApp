import { Routes, Route } from "react-router-dom";
import { SocketProvider } from "./providers/socket";
import { PeerProvider } from "./providers/peer";
import { useState } from "react";

// Pages & Components
import HomePage from "./homepage";
import Room from "./room";
import Chat from "./chatRoom";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Layout from "./components/Layout";

const App = () => {
  const [homeRoom, setHomeRoom] = useState(null);

  return (
    <SocketProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage homeRoom={homeRoom} />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/chatRoom" element={<Chat />} />
          <Route 
            path="/videoRoom" 
            element={
              <PeerProvider room={homeRoom}>
                <Room setHomeRoom={setHomeRoom} />
              </PeerProvider>
            } 
          />
        </Routes>
      </Layout>
    </SocketProvider>
  );
};

export default App;
