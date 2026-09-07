import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { getDeviceId } from '../lib/identity';
import { getDevicePostCount, getIdentity, lockIdentity } from '../lib/api';

// ========== MOOD OPTIONS CONFIGURATION ==========
const moodOptions = [
  { name: "Happy", emoji: "😊" },
  { name: "Sad", emoji: "😢" },
  { name: "Angry", emoji: "😠" },
  { name: "Hopeful", emoji: "🤞" },
  { name: "Anxious", emoji: "😰" },
];

const PostModal = ({ isOpen, onClose, onPost, autoDeleteHours = 10 }) => {
  // ========== STATE VARIABLES ==========
  const [text, setText] = useState("");
  const [mood, setMood] = useState("Happy");
  const [username, setUsername] = useState("");
  const [nameError, setNameError] = useState("");
  const [rateLimitError, setRateLimitError] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  // ========== DYNAMIC NAME LOCK LOGIC (DB BACKED) ==========
  useEffect(() => {
    if (!isOpen) return;
    
    const loadIdentity = async () => {
      const deviceId = getDeviceId();
      const identity = await getIdentity(deviceId);
      
      if (identity) {
        const hoursSinceSet = (Date.now() - new Date(identity.created_at).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceSet < autoDeleteHours) {
          setUsername(identity.username);
          setIsLocked(true);
        } else {
          setIsLocked(false);
          setUsername(""); 
        }
      } else {
        setIsLocked(false);
        setUsername("");
      }
    };
    
    loadIdentity();
  }, [isOpen, autoDeleteHours]);

  // Early return if modal is closed
  if (!isOpen) return null;

  // ========== FORM SUBMISSION HANDLER ==========
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    setRateLimitError("");
    
    // Validation 1: Name is REQUIRED
    if (!username.trim()) {
      setNameError("Your name is required."); 
      return;
    }

    // Validation 2: Rate Limit Check
    const deviceId = getDeviceId();
    const postCount = await getDevicePostCount(deviceId);
    if (postCount >= 5) {
      setRateLimitError("Rate limit reached: Max 5 posts every 5 hours.");
      return;
    }

    // Validation 3: NEW - Check if username contains blacklisted words
    const badWords = JSON.parse(localStorage.getItem('freespace_bad_words')) || [];
    if (badWords.some(word => username.toLowerCase().includes(word.toLowerCase()))) {
      setNameError("Banned words are not allowed in names!");
      return;
    }
    
    // Validation 4: Text is also required
    if (!text.trim()) return; 
    
    // Save/Lock the name to the DB if not already locked
    if (!isLocked) {
      await lockIdentity(deviceId, username.trim());
      setIsLocked(true);
    }

    // Submit the post to the Dashboard
    onPost({
      username: username.trim(),
      mood: mood,
      text: text,
      deviceId: deviceId
    });

    // Reset form and close modal
    setText("");
    setMood("Happy");
    setNameError("");
    onClose();
  };

  // ========== UI / JSX RETURN ==========
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 sm:p-8 w-full max-w-lg shadow-2xl border border-white/50 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-transparent bg-clip-text mb-6">
          Share your thoughts ✨
        </h2>
        
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div> 
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Your name (Required)" 
                  value={username}
                  onChange={(e) => { if (!isLocked) { setUsername(e.target.value); setNameError(""); } }}
                  disabled={isLocked}
                  className={`w-full px-4 py-3 rounded-xl bg-purple-50/50 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm transition-all ${nameError ? 'ring-2 ring-red-400 bg-red-50/50 placeholder-red-400' : ''} ${isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}
                />
                {isLocked && <span className="absolute right-3 top-3 text-[10px] uppercase font-bold text-purple-400">Locked</span>}
              </div>
              {nameError && <p className="text-red-500 text-xs font-bold mt-2">{nameError}</p>}
              {rateLimitError && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-xs font-medium animate-shake">
                  <AlertCircle size={16} />
                  {rateLimitError}
                </div>
              )}
              {!isLocked && (
                <p className="text-[10px] text-gray-400 mt-2 italic flex items-center gap-1 leading-tight">
                  <AlertCircle size={10} /> Choose wisely. Name locks for {autoDeleteHours} hours after first post.
                </p>
              )}
            </div>
            
            <div className="relative">
              <textarea 
                placeholder="What's on your mind?" 
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={300}
                className="w-full px-4 py-3 rounded-xl bg-purple-50/50 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm transition-all min-h-[120px] resize-none pb-8"
                required
              />
              <div className={`absolute bottom-3 right-3 text-xs font-medium ${text.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                {text.length}/300
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">How are you feeling?</label>
              <div className="flex gap-2 flex-wrap">
                {moodOptions.map((m) => (
                  <button 
                    type="button"
                    key={m.name}
                    onClick={() => setMood(m.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      mood === m.name 
                        ? 'bg-purple-600 text-white shadow-md scale-105' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    {m.emoji} {m.name}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!text.trim() || !username.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Anonymously 🚀
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostModal;