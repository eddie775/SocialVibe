import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Heart, MessageCircle, Video, Send, MoreVertical, X, Play, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Post Component ---
const PostCard: React.FC<{ post: any }> = ({ post }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!user) return;
    const likeDoc = doc(db, 'posts', post.id, 'likes', user.uid);
    const unsub = onSnapshot(likeDoc, (snap) => setLiked(snap.exists()));
    return unsub;
  }, [post.id, user]);

  const handleLike = async () => {
    if (!user) return;
    const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
    const postRef = doc(db, 'posts', post.id);
    try {
      if (liked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, { userId: user.uid });
        await updateDoc(postRef, { likesCount: increment(1) });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, postRef.path);
    }
  };

  const handleDelete = async () => {
    if (!user || user.uid !== post.authorId) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `posts/${post.id}`);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[24px] border border-gray-100 overflow-hidden mb-6 shadow-sm"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={post.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} className="w-10 h-10 rounded-full bg-gray-100" referrerPolicy="no-referrer" />
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">{post.authorName}</h3>
            <p className="text-xs text-gray-400">
              {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now'}
            </p>
          </div>
        </div>
        {user?.uid === post.authorId && (
          <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="px-4 pb-3">
        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.videoUrl && (
        <div className="relative aspect-video bg-black group cursor-pointer">
          <video src={post.videoUrl} className="w-full h-full object-cover" controls />
        </div>
      )}

      <div className="p-4 border-t border-gray-50 flex items-center gap-6">
        <button 
          onClick={handleLike}
          className={cn(
            "flex items-center gap-2 transition-colors",
            liked ? "text-red-500" : "text-gray-500 hover:text-red-500"
          )}
        >
          <Heart size={20} fill={liked ? "currentColor" : "none"} />
          <span className="font-medium text-sm">{post.likesCount || 0}</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
        >
          <MessageCircle size={20} />
          <span className="font-medium text-sm">{post.commentsCount || 0}</span>
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-50 bg-gray-50/30 overflow-hidden"
          >
            <CommentsSection postId={post.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CommentsSection: React.FC<{ postId: string }> = ({ postId }) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName,
        content: text,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
      setText('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `posts/${postId}/comments`);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
        />
        <button type="submit" className="p-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
          <Send size={16} />
        </button>
      </form>
      <div className="space-y-3">
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
            <div className="bg-white p-3 rounded-2xl border border-gray-100 flex-1">
              <p className="text-xs font-semibold text-gray-900 mb-1">{c.authorName}</p>
              <p className="text-sm text-gray-700">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Create Post Component ---
const CreatePost: React.FC = () => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !video) return;
    setUploading(true);
    try {
      let videoUrl = '';
      if (video) {
        const videoRef = ref(storage, `videos/${Date.now()}_${video.name}`);
        const snap = await uploadBytes(videoRef, video);
        videoUrl = await getDownloadURL(snap.ref);
      }

      await addDoc(collection(db, 'posts'), {
        authorId: user?.uid,
        authorName: profile?.displayName || user?.displayName,
        authorPhoto: user?.photoURL,
        content,
        videoUrl,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });

      setContent('');
      setVideo(null);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 p-4 mb-8 shadow-sm">
      <form onSubmit={handleSubmit}>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full resize-none border-none focus:ring-0 text-lg text-gray-800 placeholder:text-gray-400"
          rows={3}
        />
        
        {video && (
          <div className="relative mt-2 rounded-xl overflow-hidden bg-gray-100 p-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600 truncate max-w-[200px]">{video.name}</span>
            </div>
            <button onClick={() => setVideo(null)} className="p-1 hover:bg-gray-200 rounded-full">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex gap-2">
            <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-2"
            >
              <Video size={20} />
              <span className="text-sm font-medium">Video</span>
            </button>
          </div>
          <button 
            disabled={uploading || (!content.trim() && !video)}
            className="bg-black text-white px-6 py-2 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Main Feed ---
export const Feed: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
    });
    return unsub;
  }, []);

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <CreatePost />
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-[24px]" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  );
};
