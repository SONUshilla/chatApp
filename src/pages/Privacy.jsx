import React from 'react';
import { motion } from 'framer-motion';

const Privacy = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. No Registration Required</h2>
            <p>
              Omega is designed to be completely anonymous. We do not ask for your name, email, phone number, or any other personally identifiable information (PII) to use our service. You can start chatting immediately without creating an account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Data We Collect</h2>
            <p className="mb-4">
              While you are anonymous to other users, we may collect minimal technical data to maintain service connection and safety:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-400">
              <li>IP Address (for moderation and banning purposes only)</li>
              <li>Connection Metadata (WebRTC signaling data)</li>
              <li>Chat logs are <strong>not</strong> persistently stored on our servers after the session ends.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. Peer-to-Peer Connections</h2>
            <p>
              Video and audio streams are transmitted directly between users (Peer-to-Peer). In some cases, if a direct connection cannot be established, traffic may pass through a TURN server, but it is not recorded.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. User Safety & Moderation</h2>
            <p>
              We prioritize user safety. Automated systems and manual moderation may be used to detect and ban users violating our Terms of Service (e.g., nudity, harrassment). By using Omega, you agree that you are 18 years of age or older.
            </p>
          </section>

           <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Cookies</h2>
            <p>
              We use minimal local storage to save your preferences (like "dark mode" or UI settings). We do not use third-party tracking cookies.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default Privacy;
