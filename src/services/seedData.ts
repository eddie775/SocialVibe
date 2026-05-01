import { collection, addDoc, getDocs, query, where, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const NAMES = ['Alex Rivers', 'Jordan Smith', 'Taylor Swiftly', 'Casey Cloud', 'Morgan Moon', 'Sam Sun'];
const BIOS = [
  'Exploring the world of web dev.',
  'Just a tech enthusiast sharing thoughts.',
  'Lover of music, movies, and coding.',
  'Always learning, always growing.',
  'Digital nomad and photography lover.'
];
const POSTS = [
  'Just discovered SocialVibe! The UI is so clean. ✨',
  'What is everyone working on today? I am building a social network.',
  'Anyone else excited about the new React 19 features?',
  'Coffee and code. The perfect morning combo. ☕',
  'Just uploaded my first video post! Check it out.',
  'Minimalist design is the way to go.'
];

export async function seedRandomData() {
  try {
    console.log('Starting seed...');
    
    // Create random users if they don't exist
    for (let i = 0; i < NAMES.length; i++) {
       const userId = `bot_${i}`;
       const userRef = doc(db, 'users', userId);
       await setDoc(userRef, {
         userId,
         username: NAMES[i].toLowerCase().replace(' ', '_'),
         displayName: NAMES[i],
         email: `${userId}@example.com`,
         photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
         bio: BIOS[Math.floor(Math.random() * BIOS.length)],
         createdAt: serverTimestamp()
       });

       // Create a few posts for each user
       const postCount = 1 + Math.floor(Math.random() * 2);
       for (let j = 0; j < postCount; j++) {
         await addDoc(collection(db, 'posts'), {
           authorId: userId,
           authorName: NAMES[i],
           authorPhoto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
           content: POSTS[Math.floor(Math.random() * POSTS.length)],
           likesCount: Math.floor(Math.random() * 50),
           commentsCount: 0,
           createdAt: serverTimestamp()
         });
       }
    }
    console.log('Seed completed!');
    return true;
  } catch (error) {
    console.error('Seed failed:', error);
    return false;
  }
}
