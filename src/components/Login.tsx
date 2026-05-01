import React from 'react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-12 rounded-[32px] shadow-sm max-w-md w-full text-center border border-gray-100"
      >
        <div className="w-16 h-16 bg-black rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <div className="text-white font-bold text-2xl">SV</div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">SocialVibe</h1>
        <p className="text-gray-500 mb-8">Connect, share, and chat in a minimal space.</p>
        
        <button
          onClick={handleLogin}
          className="w-full bg-black text-white py-4 rounded-2xl font-medium flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </motion.div>
    </div>
  );
};
