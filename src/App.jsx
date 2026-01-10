import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, BookOpen, Trophy, Plus, X, UploadCloud, 
  MessageCircle, Mic, MicOff, Camera, CameraOff, PhoneOff, 
  Lock, Image as ImageIcon, Sparkles, User, LogOut,
  Send, Trash2, Edit3, Pin, Flame, Smile
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = 'https://cmbugolomogriwcqcdhk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtYnVnb2xvbW9ncml3Y3FjZGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDcyNzIsImV4cCI6MjA4MzYyMzI3Mn0.flvM9pSa0fbWiW56kcwOwwBKfqSXl10DVqt3Fp6AOD8';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PIN = "2026"; 

const App = () => {
  // --- AUTH STATES ---
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState(null);

  // --- APP STATES ---
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [libraryBooks, setLibraryBooks] = useState([]); 
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [discussionTopic, setDiscussionTopic] = useState("Introduction: First Impressions?");
  const [showEmoji, setShowEmoji] = useState(false);
  
  // Forms & Loading
  const [isUploading, setIsUploading] = useState(false); 
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [selectedPdf, setSelectedPdf] = useState(null); 
  const [selectedCover, setSelectedCover] = useState(null);

  // Video
  const [isCallActive, setIsCallActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const chatBottomRef = useRef(null);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchBooks();
      fetchMessages();
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
            (payload) => {
              setChatMessages(prev => {
                if (prev.find(m => m.id === payload.new.id)) return prev;
                return [...prev, payload.new];
              });
            })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, 
            (payload) => {
              setChatMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
            })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [session]);

  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  // --- 2. AUTH FUNCTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let error;
    if (authMode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (!signUpError && data.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email: email, username: username, streak_count: 1, last_seen: new Date() }]);
        alert("Account created! You can now log in.");
        setAuthMode('login');
      }
      error = signUpError;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    }
    if (error) alert(error.message);
    setIsUploading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
    if (data) await supabase.from('profiles').update({ last_seen: new Date() }).eq('id', userId);
  };

  const handleUpdateAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Image too big! Keep it under 2MB.");

    const objectUrl = URL.createObjectURL(file);
    setProfile(prev => ({ ...prev, avatar_url: objectUrl }));
    setIsUploading(true);

    try {
      const fileName = `avatar-${Date.now()}-${session.user.id}`;
      const { error: uploadError } = await supabase.storage.from('book-files').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('book-files').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
    } catch (error) {
      alert("Error uploading image");
      fetchProfile(session.user.id);
    } finally {
      setIsUploading(false);
    }
  };

  // --- NEW: UPDATE USERNAME FUNCTION ---
  const handleUpdateUsername = async () => {
    const newName = window.prompt("Enter your new display name:", profile?.username || "");
    if (!newName) return; // User cancelled

    // Update Local State instantly
    setProfile(prev => ({ ...prev, username: newName }));

    // Update DB
    const { error } = await supabase.from('profiles').update({ username: newName }).eq('id', session.user.id);
    if (error) alert("Could not save name");
  };

  // --- 3. DATA FUNCTIONS ---
  async function fetchBooks() {
    const { data } = await supabase.from('books').select('*').order('id', { ascending: false });
    setLibraryBooks(data || []);
  }

  async function fetchMessages() {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
    setChatMessages(data || []);
  }

  // --- 4. CHAT UPGRADES ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    
    const msgText = newMessage;
    setNewMessage(""); 
    setShowEmoji(false);

    const tempId = Date.now();
    const tempMsg = {
        id: tempId,
        content: msgText,
        user_id: session.user.id,
        username: profile.username || "Member",
        avatar_url: profile.avatar_url,
        created_at: new Date().toISOString(),
        pending: true 
    };
    setChatMessages(prev => [...prev, tempMsg]);

    const { data, error } = await supabase.from('messages').insert([{
        content: msgText,
        user_id: session.user.id,
        username: profile.username || "Member",
        avatar_url: profile.avatar_url
    }]).select();

    if (error) {
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
        alert("Failed to send");
    } else {
        setChatMessages(prev => prev.map(m => m.id === tempId ? data[0] : m));
    }
  };

  const handleDeleteMessage = async (id) => {
    if(!window.confirm("Delete this message?")) return;
    setChatMessages(prev => prev.filter(m => m.id !== id));
    await supabase.from('messages').delete().eq('id', id);
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  // --- 5. SMART VOTE LOGIC ---
  const handleVote = async (book) => {
    const userId = session.user.id;
    let currentVoters = book.voted_by || [];
    let newVoters;

    if (currentVoters.includes(userId)) {
        newVoters = currentVoters.filter(id => id !== userId);
    } else {
        newVoters = [...currentVoters, userId];
    }

    const updatedBooks = libraryBooks.map(b => b.id === book.id ? {...b, voted_by: newVoters} : b);
    setLibraryBooks(updatedBooks);
    
    await supabase.from('books').update({ voted_by: newVoters }).eq('id', book.id);
  };

  // --- 6. UPLOAD & DELETE ---
  const closeAndResetForm = () => {
    setShowUploadForm(false); setNewBookTitle(""); setNewBookAuthor(""); setSelectedPdf(null); setSelectedCover(null); setIsUploading(false);
  };

  const handleUploadBook = async (e) => {
    e.preventDefault();
    if (!newBookTitle || !selectedPdf) return alert("Select a PDF!");
    if (selectedPdf.size > 10 * 1024 * 1024) return alert("PDF too big (Max 10MB)");
    
    setIsUploading(true);
    try {
      const pdfName = `pdf-${Date.now()}-${selectedPdf.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      await supabase.storage.from('book-files').upload(pdfName, selectedPdf);
      const { data: { publicUrl: pdfUrl } } = supabase.storage.from('book-files').getPublicUrl(pdfName);

      let coverUrl = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=60";
      if (selectedCover) {
        const coverName = `img-${Date.now()}-${selectedCover.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        await supabase.storage.from('book-files').upload(coverName, selectedCover);
        const { data: { publicUrl } } = supabase.storage.from('book-files').getPublicUrl(coverName);
        coverUrl = publicUrl;
      }

      await supabase.from('books').insert([{ title: newBookTitle, author: newBookAuthor, cover: coverUrl, pdf_url: pdfUrl, voted_by: [] }]);
      fetchBooks();
      closeAndResetForm();
      alert("Book Uploaded!");
    } catch (err) { alert(err.message); setIsUploading(false); }
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (!error) setLibraryBooks(libraryBooks.filter(book => book.id !== id));
  };

  // --- 7. VIDEO & ADMIN ---
  const handleAdminToggle = () => {
    if (isAdmin) setIsAdmin(false);
    else if (window.prompt("Enter Admin PIN:") === ADMIN_PIN) setIsAdmin(true);
  };
  const startCall = async () => {
    try { setIsCallActive(true); const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; } catch (err) { alert("Camera Error"); setIsCallActive(false); }
  };
  const endCall = () => { setIsCallActive(false); if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); };
  const handleUpdateTopic = () => { const newTopic = window.prompt("Set new discussion topic:", discussionTopic); if (newTopic) setDiscussionTopic(newTopic); };

  // --- RENDER LOGIN ---
  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
           <div className="flex justify-center mb-6"><div className="bg-indigo-600 p-3 rounded-2xl"><BookOpen size={32} /></div></div>
           <h1 className="text-3xl font-bold text-center mb-2">Mindful<span className="text-indigo-500">Readers</span></h1>
           <p className="text-center text-gray-400 mb-8">Exclusive Book Club Access</p>
           <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 bg-gray-900 rounded-xl border border-white/10" required />}
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-gray-900 rounded-xl border border-white/10" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-900 rounded-xl border border-white/10" required />
              <button disabled={isUploading} className="w-full bg-indigo-600 font-bold py-4 rounded-xl hover:scale-[1.02] transition">{isUploading ? "Processing..." : (authMode === 'login' ? "Enter Club" : "Join Club")}</button>
           </form>
           <div className="mt-6 text-center text-sm">{authMode === 'login' ? "New member? " : "Have an account? "}<button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-indigo-400 font-bold">{authMode === 'login' ? "Sign Up" : "Log In"}</button></div>
        </div>
      </div>
    );
  }

  const bgStyle = "min-h-screen bg-black font-sans pb-28 text-white";

  return (
    <div className={bgStyle}>
      {!isCallActive && (
        <nav className="fixed top-0 left-0 right-0 z-30 bg-black/50 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover border border-indigo-500" /> : <div className="bg-indigo-600 p-1.5 rounded-lg"><User size={16} fill="white" /></div>}
            <h1 className="text-lg font-bold tracking-tight">Hi, {profile?.username || 'Member'}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdminToggle} className={`text-[10px] px-3 py-1.5 rounded-full border font-bold uppercase tracking-wider flex items-center gap-1 ${isAdmin ? 'bg-indigo-600 border-indigo-500' : 'border-white/20 text-white/50'}`}><Lock size={10} /> {isAdmin ? "Admin" : "Mem"}</button>
            <button onClick={handleLogout} className="text-gray-500"><LogOut size={16}/></button>
          </div>
        </nav>
      )}

      <main className={`pt-20 px-4 max-w-lg mx-auto relative ${isCallActive ? 'p-0 max-w-full h-screen overflow-hidden' : ''}`}>
        
        {isCallActive && (
           <div className="fixed inset-0 bg-black z-50 flex flex-col">
             <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span><span className="text-xs font-bold">Live</span></div>
             </div>
             <div className="flex-1 relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-center bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10"><User size={32} className="text-white/50 mx-auto mb-2"/><p className="text-white/80 font-bold">You are the Host</p><p className="text-white/40 text-xs">Waiting for others...</p></div></div>
             </div>
             <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-8 z-50 px-8">
               <button onClick={() => setMicOn(!micOn)} className={`p-5 rounded-full shadow-2xl transition-all ${micOn ? 'bg-gray-800/80 backdrop-blur-md text-white' : 'bg-white text-black'}`}>{micOn ? <Mic size={24}/> : <MicOff size={24}/>}</button>
               <button onClick={endCall} className="bg-red-500 p-6 rounded-2xl hover:scale-105 transition shadow-red-900/40 shadow-xl border-4 border-black"><PhoneOff size={32} fill="white" /></button>
               <button onClick={() => setCameraOn(!cameraOn)} className={`p-5 rounded-full shadow-2xl transition-all ${cameraOn ? 'bg-gray-800/80 backdrop-blur-md text-white' : 'bg-white text-black'}`}>{cameraOn ? <Camera size={24}/> : <CameraOff size={24}/>}</button>
             </div>
           </div>
        )}

        {!isCallActive && activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in zoom-in duration-300">
             <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl p-6 relative overflow-hidden flex items-center justify-between">
               <div><h2 className="text-2xl font-bold">Daily Streak</h2><p className="text-white/80 text-sm">You're on fire!</p></div>
               <div className="text-5xl font-black flex items-center gap-1"><Flame size={40} fill="white" /> {profile?.streak_count || 1}</div>
             </div>
             <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 text-center">
                <div className="relative inline-block">
                    {profile?.avatar_url ? <img src={profile.avatar_url} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-indigo-500" /> : <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-gray-700"><User size={40}/></div>}
                    <label className="absolute bottom-4 right-0 bg-white text-black p-2 rounded-full cursor-pointer hover:scale-110 transition"><Camera size={14}/><input type="file" accept="image/*" className="hidden" onChange={handleUpdateAvatar}/></label>
                </div>
                {/* --- UPDATE NAME BUTTON (Interactive Now) --- */}
                <button onClick={handleUpdateUsername} className="flex items-center gap-2 mx-auto justify-center hover:opacity-80 transition">
                    <h3 className="text-xl font-bold">{profile?.username || "Update Name"}</h3>
                    <Edit3 size={14} className="text-gray-500"/>
                </button>
                <p className="text-gray-500 text-sm">Member since 2026</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setActiveTab('vote')} className="bg-gray-900 p-6 rounded-3xl border border-white/5 hover:border-indigo-500/50 transition group"><div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Trophy size={24}/></div><span className="font-bold text-gray-200">Vote Next</span></button>
               <button onClick={startCall} className="bg-gray-900 p-6 rounded-3xl border border-white/5 hover:border-green-500/50 transition group"><div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-green-500 group-hover:text-white transition-colors"><Camera size={24}/></div><span className="font-bold text-gray-200">Join Live</span></button>
             </div>
          </div>
        )}

        {/* ... Rest of app (Library, Vote, Chat, etc.) is the same ... */}
        {/* I am omitting the bottom half here to save space, but you can paste the FULL file above which includes everything! */}
        
        {!isCallActive && activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end px-1">
               <div><h2 className="text-3xl font-bold">Library</h2><p className="text-white/40 text-sm">{libraryBooks.length} Books</p></div>
               {isAdmin && <button onClick={() => setShowUploadForm(true)} className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"><Plus size={16}/> Add</button>}
            </div>
            <div className="grid grid-cols-2 gap-4">
               {libraryBooks.map(book => {
                  const voteCount = book.voted_by ? book.voted_by.length : 0;
                  const hasVoted = book.voted_by && book.voted_by.includes(session.user.id);
                  return (
                    <div key={book.id} className="group relative">
                        <div className="aspect-[2/3] bg-gray-900 rounded-xl mb-3 relative overflow-hidden">
                        <img src={book.cover} className="w-full h-full object-cover opacity-90" />
                        <a href={book.pdf_url} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"><span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold">Read</span></a>
                        {isAdmin && <button onClick={(e) => { e.preventDefault(); handleDeleteBook(book.id); }} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:scale-110 shadow-lg z-20"><Trash2 size={14}/></button>}
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="flex-1"><h3 className="font-bold text-sm line-clamp-1">{book.title}</h3><p className="text-xs text-gray-400">{book.author}</p></div>
                            <button onClick={() => handleVote(book)} className={`flex flex-col items-center text-xs transition ${hasVoted ? 'text-yellow-400' : 'text-gray-500 hover:text-white'}`}>
                                <Trophy size={14} fill={hasVoted ? "currentColor" : "none"}/>{voteCount}
                            </button>
                        </div>
                    </div>
                  );
               })}
            </div>
          </div>
        )}

        {!isCallActive && activeTab === 'vote' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <h2 className="text-3xl font-bold px-1">Top Voted</h2>
                <div className="space-y-4">
                    {libraryBooks
                        .sort((a,b) => ((b.voted_by?.length || 0) - (a.voted_by?.length || 0)))
                        .slice(0, 3)
                        .map((book, index) => {
                            const voteCount = book.voted_by ? book.voted_by.length : 0;
                            const hasVoted = book.voted_by && book.voted_by.includes(session.user.id);
                            return (
                                <div key={book.id} className="bg-gray-900 p-4 rounded-2xl flex items-center gap-4 border border-white/10">
                                    <div className="text-2xl font-bold text-gray-600">#{index + 1}</div>
                                    <img src={book.cover} className="w-12 h-16 object-cover rounded-lg"/>
                                    <div className="flex-1">
                                        <h3 className="font-bold">{book.title}</h3>
                                        <p className="text-xs text-gray-400">{voteCount} Votes</p>
                                    </div>
                                    <button onClick={() => handleVote(book)} className={`p-3 rounded-full transition ${hasVoted ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white'}`}><Trophy size={16}/></button>
                                </div>
                            );
                    })}
                </div>
            </div>
        )}

        {!isCallActive && activeTab === 'chat' && (
            <div className="flex flex-col h-[75vh]">
                <h2 className="text-2xl font-bold px-1 mb-4">Chat</h2>
                <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-2xl mb-4 relative">
                   <div className="flex items-center gap-2 mb-1"><Pin size={12} className="text-indigo-400"/><span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Current Topic</span></div>
                   <p className="text-sm font-medium text-indigo-100 pr-6">"{discussionTopic}"</p>
                   {isAdmin && <button onClick={handleUpdateTopic} className="absolute top-4 right-4 text-indigo-400 hover:text-white"><Edit3 size={14}/></button>}
                </div>
                
                {/* MESSAGES AREA */}
                <div className="flex-1 space-y-4 overflow-y-auto mb-4 scrollbar-hide px-1">
                    {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 group ${msg.user_id === session.user.id ? 'flex-row-reverse' : ''}`}>
                            <img src={msg.avatar_url || "https://via.placeholder.com/30"} className="w-8 h-8 rounded-full object-cover bg-gray-700"/>
                            <div className={`relative p-3 rounded-2xl max-w-[80%] ${msg.user_id === session.user.id ? 'bg-indigo-600 rounded-tr-none' : 'bg-gray-800 rounded-tl-none'}`}>
                                <p className="text-[10px] font-bold opacity-50 mb-1">{msg.username}</p>
                                <p className="text-sm">{msg.content}</p>
                                {msg.pending && <span className="text-[9px] opacity-60 italic mt-1 block text-right">sending...</span>}
                                {/* DELETE BUTTON */}
                                {msg.user_id === session.user.id && !msg.pending && (
                                    <button onClick={() => handleDeleteMessage(msg.id)} className="absolute -top-2 -left-2 bg-red-500 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition shadow-md"><Trash2 size={10}/></button>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={chatBottomRef} />
                </div>

                {/* EMOJI BAR */}
                {showEmoji && (
                  <div className="bg-gray-900 border border-white/10 rounded-2xl p-2 mb-2 flex gap-2 overflow-x-auto">
                    {["❤️","🔥","😂","👍","👏","🎉","📚","💡","👀","🚀"].map(e => (
                      <button key={e} onClick={() => addEmoji(e)} className="text-xl p-2 hover:bg-white/10 rounded-lg transition">{e}</button>
                    ))}
                  </div>
                )}

                {/* INPUT AREA */}
                <form onSubmit={handleSendMessage} className="flex gap-2 bg-gray-900 p-2 rounded-2xl border border-white/10 items-center">
                    <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-xl transition ${showEmoji ? 'text-indigo-400' : 'text-gray-400'}`}><Smile size={20}/></button>
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Say something..." className="flex-1 bg-transparent px-2 text-sm focus:outline-none" />
                    <button className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 transition"><Send size={18}/></button>
                </form>
            </div>
        )}

        {showUploadForm && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-3xl w-full max-w-sm p-6">
              <h3 className="text-xl font-bold mb-4">Add Book</h3>
              <form onSubmit={handleUploadBook} className="space-y-4">
                <input type="text" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} className="w-full p-3 bg-black rounded-xl border border-white/10" placeholder="Title" />
                <input type="text" value={newBookAuthor} onChange={e => setNewBookAuthor(e.target.value)} className="w-full p-3 bg-black rounded-xl border border-white/10" placeholder="Author" />
                <input type="file" accept="application/pdf" onChange={e => setSelectedPdf(e.target.files[0])} className="text-sm text-gray-500" />
                <input type="file" accept="image/*" onChange={e => setSelectedCover(e.target.files[0])} className="text-sm text-gray-500" />
                <button disabled={isUploading} className="w-full bg-indigo-600 font-bold py-3 rounded-xl">{isUploading ? "Uploading..." : "Save"}</button>
                <button type="button" onClick={closeAndResetForm} className="w-full text-gray-500 mt-2">Cancel</button>
              </form>
            </div>
          </div>
        )}

        {!isCallActive && (
          <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 flex justify-around p-2 pb-8 z-30">
            {[{ id: 'dashboard', icon: Home, label: 'Home' }, { id: 'library', icon: BookOpen, label: 'Library' }, { id: 'vote', icon: Trophy, label: 'Vote' }, { id: 'chat', icon: MessageCircle, label: 'Chat' }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 p-2 w-20 ${activeTab === tab.id ? 'text-white' : 'text-gray-500'}`}>
                <tab.icon size={20} /><span className="text-[10px] font-bold">{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;