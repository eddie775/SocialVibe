import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Send, User as UserIcon, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'rooms'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const startNewChat = async (targetUser: any) => {
    if (!user) return;
    // Check if room exists
    const q = query(collection(db, 'rooms'), where('participants', 'array-contains', user.uid));
    const snap = await getDocs(q);
    const existingRoom = snap.docs.find(d => {
      const parts = d.data().participants;
      return parts.includes(targetUser.id) && parts.length === 2;
    });

    if (existingRoom) {
      setActiveRoomId(existingRoom.id);
    } else {
      const newRoom = await addDoc(collection(db, 'rooms'), {
        participants: [user.uid, targetUser.id],
        lastMessage: '',
        updatedAt: serverTimestamp()
      });
      setActiveRoomId(newRoom.id);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-bottom border-gray-50 bg-gray-50/50">
          <h2 className="font-bold text-xl flex items-center gap-2">
            <MessageSquare size={20} />
            Messages
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 && !loading && (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm">No chats yet.</p>
              <UserSearch onSelect={startNewChat} />
            </div>
          )}
          {rooms.map(room => (
            <button 
              key={room.id}
              onClick={() => setActiveRoomId(room.id)}
              className={`w-full p-4 flex items-center gap-3 transition-colors text-left ${activeRoomId === room.id ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-900'}`}
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
                <UserIcon size={24} className={activeRoomId === room.id ? 'text-gray-400' : 'text-gray-400'} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">Chat Room</p>
                <p className={`text-xs truncate ${activeRoomId === room.id ? 'text-gray-400' : 'text-gray-500'}`}>
                  {room.lastMessage || 'Start a conversation'}
                </p>
              </div>
            </button>
          ))}
          <div className="p-4 border-t border-gray-50">
             <UserSearch onSelect={startNewChat} />
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 bg-[#F9F9F9] relative flex flex-col">
        {activeRoomId ? (
          <ChatMessages roomId={activeRoomId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

const UserSearch: React.FC<{ onSelect: (user: any) => void }> = ({ onSelect }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const handleSearch = async () => {
    const q = query(collection(db, 'users')); // Simple search for demo
    const snap = await getDocs(q);
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user?.uid));
  };

  useEffect(() => { handleSearch(); }, []);

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Discover People</p>
      <div className="space-y-2">
        {users.map(u => (
          <button 
            key={u.id}
            onClick={() => onSelect(u)}
            className="w-full p-2 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
          >
            <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} className="w-8 h-8 rounded-full bg-gray-100" />
            <span className="text-sm font-medium text-gray-700">{u.displayName || u.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatMessages: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [roomId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        senderId: user.uid,
        text: text,
        createdAt: serverTimestamp()
      });
      setText('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-4 rounded-[20px] shadow-sm ${m.senderId === user?.uid ? 'bg-black text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
              <p className="text-sm">{m.text}</p>
              <p className={`text-[10px] mt-1 ${m.senderId === user?.uid ? 'text-gray-400' : 'text-gray-400'}`}>
                {m.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Now'}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-6 bg-white border-t border-gray-100">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#F5F5F5] border-none rounded-2xl px-6 py-3 focus:outline-none focus:ring-2 focus:ring-black/5"
          />
          <button type="submit" className="p-4 bg-black text-white rounded-2xl hover:bg-gray-800 transition-colors">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
