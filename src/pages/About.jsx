import React from 'react';
import { motion } from 'framer-motion';

const About = () => {
  return (
    <div className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 rounded-full blur-[120px]"></div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-extrabold mb-6">
            About <span className="text-gradient">AnonSphere</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Reimagining how the world connects. Safe, anonymous, and instant interactions with people from every corner of the globe.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-white">Our Mission</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              In a world that is more connected than ever, true connection is becoming rare. Algorithms dictate who we meet. 
              AnonSphere breaks these bubbles. We believe in the serendipity of random encounters.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              We provide a platform where you can be yourself—or anyone you want to be—without the pressure of persistent profiles or social graphs.
            </p>
          </motion.div>
          
           <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative glass-panel rounded-2xl p-8"
          >
             {/* Decorative placeholder visual */}
             <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 opacity-30 blur"></div>
             <div className="relative h-64 bg-black/50 rounded-xl flex items-center justify-center border border-white/10">
                <span className="text-gray-500 font-mono text-sm">[ Visual: Network Connection Graph ]</span>
             </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
                { title: 'Anonymity First', desc: 'No registration required. Your identity is yours to keep.' },
                { title: 'Global Reach', desc: 'Connect with millions of users across 190+ countries.' },
                { title: 'Secure & Safe', desc: 'Advanced moderation and encryption to keep conversations safe.' }
            ].map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2, duration: 0.6 }}
                  className="glass-panel p-8 rounded-xl hover:bg-white/10 transition-colors"
                >
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">{feature.title}</h3>
                    <p className="text-gray-400">{feature.desc}</p>
                </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default About;
