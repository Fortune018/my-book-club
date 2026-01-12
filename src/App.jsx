import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, BookOpen, Trophy, Plus, X, UploadCloud, 
  MessageCircle, Mic, MicOff, Camera, CameraOff, PhoneOff, 
  Lock, User, LogOut, Send, Trash2, Edit3, Pin, Flame, 
  Smile, CheckCircle, AlertCircle, Sparkles, Zap
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = 'https://cmbugolomogriwcqcdhk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtYnVnb2xvbW9ncml3Y3FjZGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDcyNzIsImV4cCI6MjA4MzYyMzI3Mn0.flvM9pSa0fbWiW56kcwOwwBKfqSXl10DVqt3Fp6AOD8';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PIN = "2026"; 

const App = () => {
  // --- STATES ---
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState(null);
  const [notification, setNotification] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [libraryBooks, setLibraryBooks] = useState([]); 
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [discussionTopic, setDiscussionTopic] = useState("Introduction");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Upload States
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [selectedPdf, setSelectedPdf] = useState(null); 
  const [selectedCover, setSelectedCover] = useState(null);

  // Video State
  const [isCallActive, setIsCallActive] = useState(false);
  const chatBottomRef = useRef(null);

  // --- INITIALIZATION & STREAK LOGIC ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) handleProfileLoad(session.user.id, session.user.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) handleProfileLoad(session.user.id, session.user.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleProfileLoad = async (userId, userEmail) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (!data) {
        // First time user
        const newProfile = { id: userId, email: userEmail, username: "Reader", streak_count: 1, last_seen: new Date() };
        await supabase.from('profiles').upsert([newProfile]);
        setProfile(newProfile);
    } else {
        // CHECK STREAK LOGIC
        const today = new Date().toDateString();
        const lastSeen = new Date(data.last_seen).toDateString();
        let newStreak = data.streak_count;

        if (today !== lastSeen) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (yesterday.toDateString() === lastSeen) {
                newStreak += 1; // Kept the streak alive
            } else {
                newStreak = 1; // Broken streak
            }
            
            // Update DB with new streak and today's date
            await supabase.from('profiles').update({ 
                last_seen: new Date(), 
                streak_count: newStreak 
            }).eq('id', userId);
        }

        setProfile({ ...data, streak_count: newStreak });
    }
  };

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
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [session]);

  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  // --- HELPERS ---
  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000); 
  };

  // --- ACTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let error;
    if (authMode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, password, options: { emailRedirectTo: 'https://my-book-club-rosy.vercel.app' }
      });
      if (!signUpError && data.user) {
        await supabase.from('profiles').upsert([{ id: data.user.id, email: email, username: username, streak_count: 1, last_seen: new Date() }]);
        showNotification("Welcome! You are logged in.", 'success');
      }
      error = signUpError;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    }
    if (error) showNotification(error.message, 'error');
    setIsUploading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); };

  const handleUpdateAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setProfile(prev => ({ ...prev, avatar_url: objectUrl }));
    setIsUploading(true);
    try {
      const fileName = `avatar-${Date.now()}-${session.user.id}`;
      await supabase.storage.from('book-files').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('book-files').getPublicUrl(fileName);
      await supabase.from('profiles').upsert({ id: session.user.id, avatar_url: publicUrl });
      showNotification("Looking good! 📸");
    } catch (err) { showNotification("Upload failed", 'error'); } 
    finally { setIsUploading(false); }
  };

  const handleUpdateUsername = async () => {
    const newName = window.prompt("New Display Name:", profile?.username || "");
    if (!newName) return; 
    setProfile(prev => ({ ...prev, username: newName }));
    await supabase.from('profiles').upsert({ id: session.user.id, username: newName });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    const msgText = newMessage;
    setNewMessage(""); setShowEmoji(false);
    const tempId = Date.now();
    setChatMessages(prev => [...prev, { id: tempId, content: msgText, user_id: session.user.id, username: profile.username, avatar_url: profile.avatar_url, created_at: new Date().toISOString(), pending: true }]);
    await supabase.from('messages').insert([{ content: msgText, user_id: session.user.id, username: profile.username || "Reader", avatar_url: profile.avatar_url }]);
  };

  const handleUploadBook = async (e) => {
    e.preventDefault();
    if (!newBookTitle || !selectedPdf) return showNotification("PDF required!", 'error');
    setIsUploading(true);
    try {
      const pdfName = `pdf-${Date.now()}`;
      await supabase.storage.from('book-files').upload(pdfName, selectedPdf);
      const { data: { publicUrl: pdfUrl } } = supabase.storage.from('book-files').getPublicUrl(pdfName);

      let coverUrl = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=60";
      if (selectedCover) {
        const coverName = `img-${Date.now()}`;
        await supabase.storage.from('book-files').upload(coverName, selectedCover);
        const { data: { publicUrl } } = supabase.storage.from('book-files').getPublicUrl(coverName);
        coverUrl = publicUrl;
      }

      await supabase.from('books').insert([{ title: newBookTitle, author: newBookAuthor, cover: coverUrl, pdf_url: pdfUrl, voted_by: [] }]);
      fetchBooks();
      setShowUploadForm(false);
      showNotification("Book Added to Library!");
    } catch (err) { showNotification(err.message, 'error'); } 
    finally { setIsUploading(false); }
  };

  const handleVote = async (book) => {
    const userId = session.user.id;
    let currentVoters = book.voted_by || [];
    const newVoters = currentVoters.includes(userId) ? currentVoters.filter(id => id !== userId) : [...currentVoters, userId];
    setLibraryBooks(prev => prev.map(b => b.id === book.id ? {...b, voted_by: newVoters} : b));
    await supabase.from('books').update({ voted_by: newVoters }).eq('id', book.id);
  };

  const handleDeleteBook = async (id) => { if(window.confirm("Delete book?")) { await supabase.from('books').delete().eq('id', id); fetchBooks(); }};
  const handleDeleteMessage = async (id) => { if(window.confirm("Delete msg?")) { setChatMessages(prev => prev.filter(m => m.id !== id)); await supabase.from('messages').delete().eq('id', id); }};
  
  async function fetchBooks() { const { data } = await supabase.from('books').select('*').order('id', { ascending: false }); setLibraryBooks(data || []); }
  async function fetchMessages() { const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }); setChatMessages(data || []); }
  
  const handleAdminToggle = () => { if (isAdmin) setIsAdmin(false); else if (window.prompt("Admin PIN:") === ADMIN_PIN) { setIsAdmin(true); showNotification("Admin Active"); }};

  // --- VISUAL COMPONENTS ---
  // Background with Overlay
  const Background = () => (
    <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2690&auto=format&fit=crop')] bg-cover bg-center opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950/90 to-black/90"></div>
    </div>
  );

  // LOGIN SCREEN
  if (!session) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <Background />
        {notification && <div className="fixed top-6 left-6 right-6 p-4 rounded-xl bg-emerald-500/90 backdrop-blur-md text-white font-bold text-center z-50 animate-in slide-in-from-top">{notification.message}</div>}
        
        <div className="w-full max-w-sm relative z-10 bg-black/30 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
           <div className="flex justify-center mb-6"><div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-4 rounded-2xl shadow-lg shadow-indigo-500/20"><BookOpen size={40} className="text-white" /></div></div>
           <h1 className="text-4xl font-black text-center mb-2 tracking-tight">Mindful<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Readers</span></h1>
           <p className="text-center text-white/50 mb-8 font-medium">Your Sanctuary for Knowledge</p>
           
           <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && <input type="text" placeholder="Choose a Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 bg-black/40 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none transition text-white placeholder:text-white/30" required />}
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-black/40 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none transition text-white placeholder:text-white/30" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-black/40 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none transition text-white placeholder:text-white/30" required />
              <button disabled={isUploading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-indigo-900/50">{isUploading ? "Connecting..." : (authMode === 'login' ? "Enter Sanctuary" : "Join the Club")}</button>
           </form>
           <div className="mt-8 text-center text-sm text-white/40">{authMode === 'login' ? "New here? " : "Already a member? "}<button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-indigo-400 font-bold hover:text-white transition">{authMode === 'login' ? "Create Account" : "Sign In"}</button></div>
        </div>
      </div>
    );
  }

  // APP INTERFACE
  return (
    <div className="min-h-screen font-sans pb-28 text-white relative overflow-hidden">
      <Background />
      
      {/* NOTIFICATIONS */}
      {notification && (
        <div className={`fixed top-20 left-4 right-4 p-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-top duration-300 z-[100] backdrop-blur-md border border-white/10 ${notification.type === 'error' ? 'bg-red-500/80' : 'bg-emerald-600/80'}`}>
            {notification.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
            <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}

      {/* TOP NAV */}
      {!isCallActive && (
        <nav className="fixed top-0 left-0 right-0 z-30 bg-black/20 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/50" /> : <div className="bg-indigo-600 p-2 rounded-full"><User size={20} /></div>}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full"></div>
            </div>
            <div>
                <h1 className="text-sm font-bold opacity-60 uppercase tracking-widest">Welcome</h1>
                <h2 className="text-lg font-bold leading-none">{profile?.username || 'Reader'}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdminToggle} className={`p-2 rounded-full transition ${isAdmin ? 'bg-indigo-600 text-white' : 'text-white/30 hover:bg-white/10'}`}><Lock size={18} /></button>
            <button onClick={handleLogout} className="p-2 rounded-full text-white/30 hover:bg-red-500/20 hover:text-red-400 transition"><LogOut size={18}/></button>
          </div>
        </nav>
      )}

      {/* MAIN CONTENT */}
      <main className={`pt-24 px-4 max-w-lg mx-auto relative z-10 ${isCallActive ? 'p-0 pt-0 max-w-full h-screen' : ''}`}>
        
        {/* VIDEO ROOM */}
        {isCallActive && (
           <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col animate-in zoom-in duration-300">
             <div className="bg-black/40 backdrop-blur-md p-4 flex justify-between items-center absolute top-0 w-full z-10">
                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span><span className="font-bold text-sm tracking-wider">LIVE SESSION</span></div>
                <button onClick={() => setIsCallActive(false)} className="bg-white/10 hover:bg-red-600 hover:text-white text-white/70 px-4 py-2 rounded-full text-xs font-bold transition backdrop-blur-md border border-white/10">LEAVE ROOM</button>
             </div>
             <iframe src={`https://meet.jit.si/MindfulReadersClub_${discussionTopic.replace(/[^a-zA-Z0-9]/g, '_')}`} allow="camera; microphone; fullscreen; display-capture; autoplay" className="w-full h-full border-0" title="Video Call"></iframe>
           </div>
        )}

        {/* DASHBOARD TAB */}
        {!isCallActive && activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* STREAK CARD */}
             <div className="bg-gradient-to-br from-orange-600 via-red-600 to-rose-600 rounded-3xl p-6 relative overflow-hidden flex items-center justify-between shadow-2xl shadow-orange-900/30 border border-white/10 group">
               <div className="absolute top-0 right-0 p-8 opacity-10 transform rotate-12 group-hover:rotate-0 transition duration-700"><Flame size={100} /></div>
               <div><h2 className="text-3xl font-black text-white">Day {profile?.streak_count || 1}</h2><p className="text-orange-100 font-medium">Consistency Streak</p></div>
               <div className="w-16 h-16 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/10">🔥</div>
             </div>
             
             {/* PROFILE CARD */}
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="relative inline-block group">
                    {profile?.avatar_url ? <img src={profile.avatar_url} className="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-4 border-white/10 shadow-xl group-hover:scale-105 transition duration-500" /> : <div className="w-28 h-28 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/10 shadow-xl"><User size={40}/></div>}
                    <label className="absolute bottom-4 right-0 bg-white text-indigo-900 p-2.5 rounded-full cursor-pointer hover:bg-indigo-100 transition shadow-lg"><Camera size={16}/><input type="file" accept="image/*" className="hidden" onChange={handleUpdateAvatar}/></label>
                </div>
                <button onClick={handleUpdateUsername} className="flex items-center gap-2 mx-auto justify-center opacity-80 hover:opacity-100 transition mb-1"><h3 className="text-2xl font-bold tracking-tight">{profile?.username}</h3><Edit3 size={16}/></button>
                <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Marine Engineer</p>
             </div>

             {/* ACTION BUTTONS */}
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setActiveTab('vote')} className="bg-indigo-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/10 hover:bg-indigo-600/60 transition group text-left relative overflow-hidden">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition"><Trophy size={80}/></div>
                 <div className="bg-indigo-500/20 w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-500 group-hover:text-white transition"><Zap size={20}/></div>
                 <span className="font-bold text-indigo-100 block">Vote Book</span>
                 <span className="text-xs text-white/40">Next Month's Read</span>
               </button>
               <button onClick={() => setIsCallActive(true)} className="bg-emerald-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/10 hover:bg-emerald-600/60 transition group text-left relative overflow-hidden">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition"><Camera size={80}/></div>
                 <div className="bg-emerald-500/20 w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition"><Camera size={20}/></div>
                 <span className="font-bold text-emerald-100 block">Go Live</span>
                 <span className="text-xs text-white/40">Join the Session</span>
               </button>
             </div>
          </div>
        )}

        {/* LIBRARY TAB */}
        {!isCallActive && activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <div className="flex justify-between items-end px-2">
               <div><h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Library</h2><p className="text-white/40 text-xs font-bold uppercase tracking-widest">{libraryBooks.length} Collected Works</p></div>
               {isAdmin && <button onClick={() => setShowUploadForm(true)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition"><Plus size={16}/> Add Book</button>}
            </div>
            <div className="grid grid-cols-2 gap-4">
               {libraryBooks.map(book => (
                    <div key={book.id} className="group relative bg-white/5 border border-white/10 rounded-2xl p-3 hover:bg-white/10 transition duration-300">
                        <div className="aspect-[2/3] bg-black/50 rounded-xl mb-3 relative overflow-hidden shadow-lg">
                            <img src={book.cover} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition duration-500" />
                            <a href={book.pdf_url} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"><span className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transform translate-y-4 group-hover:translate-y-0 transition duration-300">Read Now</span></a>
                            {isAdmin && <button onClick={(e) => { e.preventDefault(); handleDeleteBook(book.id); }} className="absolute top-2 right-2 bg-red-600/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:scale-110 z-20"><Trash2 size={14}/></button>}
                        </div>
                        <h3 className="font-bold text-sm line-clamp-1 leading-tight">{book.title}</h3>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-white/40 line-clamp-1">{book.author}</p>
                            <button onClick={() => handleVote(book)} className={`flex items-center gap-1 text-xs transition px-2 py-1 rounded-full ${book.voted_by?.includes(session.user.id) ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-white/30 hover:text-white'}`}><Trophy size={12}/> {book.voted_by?.length || 0}</button>
                        </div>
                    </div>
               ))}
            </div>
          </div>
        )}

        {/* VOTE TAB */}
        {!isCallActive && activeTab === 'vote' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <h2 className="text-3xl font-bold px-2 tracking-tight">Top Picks</h2>
                <div className="space-y-3">
                    {libraryBooks.sort((a,b) => ((b.voted_by?.length || 0) - (a.voted_by?.length || 0))).slice(0, 5).map((book, index) => (
                        <div key={book.id} className="bg-white/5 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 border border-white/5 hover:border-indigo-500/50 transition duration-300 group">
                            <div className={`text-3xl font-black ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-700' : 'text-white/10'}`}>#{index + 1}</div>
                            <img src={book.cover} className="w-12 h-16 object-cover rounded-lg shadow-md group-hover:rotate-3 transition"/>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg leading-tight">{book.title}</h3>
                                <div className="flex items-center gap-2 mt-1"><div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width: `${Math.min((book.voted_by?.length || 0) * 10, 100)}%`}}></div></div><span className="text-xs text-white/50">{book.voted_by?.length || 0} votes</span></div>
                            </div>
                            <button onClick={() => handleVote(book)} className={`p-3 rounded-full transition ${book.voted_by?.includes(session.user.id) ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-white/50 hover:bg-white/20'}`}><Trophy size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* CHAT TAB */}
        {!isCallActive && activeTab === 'chat' && (
            <div className="flex flex-col h-[80vh] animate-in slide-in-from-bottom duration-500">
                <div className="bg-indigo-950/40 backdrop-blur-xl border border-indigo-500/20 p-4 rounded-2xl mb-4 relative shadow-lg">
                   <div className="flex items-center gap-2 mb-1"><Sparkles size={12} className="text-indigo-400"/><span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Live Discussion</span></div>
                   <p className="text-lg font-bold text-white pr-6 leading-tight">"{discussionTopic}"</p>
                   {isAdmin && <button onClick={() => {const t = prompt("New Topic"); if(t) setDiscussionTopic(t)}} className="absolute top-4 right-4 text-white/30 hover:text-white"><Edit3 size={14}/></button>}
                </div>
                
                <div className="flex-1 space-y-4 overflow-y-auto mb-4 scrollbar-hide px-1 pb-4">
                    {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${msg.user_id === session.user.id ? 'flex-row-reverse' : ''}`}>
                            <img src={msg.avatar_url || "https://via.placeholder.com/30"} className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-sm"/>
                            <div className={`relative p-3 rounded-2xl max-w-[80%] text-sm shadow-md ${msg.user_id === session.user.id ? 'bg-indigo-600/90 text-white rounded-tr-none' : 'bg-white/10 backdrop-blur-md text-white/90 rounded-tl-none border border-white/5'}`}>
                                <p className="text-[10px] font-bold opacity-50 mb-1">{msg.username}</p>
                                {msg.content}
                                {msg.user_id === session.user.id && !msg.pending && <button onClick={() => handleDeleteMessage(msg.id)} className="absolute -left-8 top-2 text-white/20 hover:text-red-400"><Trash2 size={12}/></button>}
                            </div>
                        </div>
                    ))}
                    <div ref={chatBottomRef} />
                </div>

                {showEmoji && ( <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 mb-2 flex gap-2 overflow-x-auto">{["❤️","🔥","😂","👍","👏","🎉","📚","💡","👀","🚀"].map(e => (<button key={e} onClick={() => {setNewMessage(p=>p+e);}} className="text-2xl p-2 hover:bg-white/10 rounded-xl transition">{e}</button>))}</div>)}

                <form onSubmit={handleSendMessage} className="flex gap-2 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 items-center shadow-2xl">
                    <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`p-3 rounded-xl transition ${showEmoji ? 'text-indigo-400 bg-white/10' : 'text-gray-400 hover:text-white'}`}><Smile size={20}/></button>
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Share your thoughts..." className="flex-1 bg-transparent px-2 text-sm focus:outline-none placeholder:text-white/20" />
                    <button className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20"><Send size={18}/></button>
                </form>
            </div>
        )}

        {/* BOTTOM NAV */}
        {!isCallActive && (
          <div className="fixed bottom-6 left-6 right-6 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full flex justify-around p-3 z-30 shadow-2xl">
            {[{ id: 'dashboard', icon: Home, label: 'Home' }, { id: 'library', icon: BookOpen, label: 'Library' }, { id: 'vote', icon: Trophy, label: 'Vote' }, { id: 'chat', icon: MessageCircle, label: 'Chat' }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-black font-bold shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
                <tab.icon size={20} />
                {activeTab === tab.id && <span className="text-xs">{tab.label}</span>}
              </button>
            ))}
          </div>
        )}

        {/* UPLOAD MODAL */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-gray-900 border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <button onClick={() => setShowUploadForm(false)} className="absolute top-4 right-4 text-white/30 hover:text-white"><X size={20}/></button>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><UploadCloud size={20} className="text-indigo-500"/> Add to Library</h3>
              <form onSubmit={handleUploadBook} className="space-y-4">
                <input type="text" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} className="w-full p-4 bg-black/50 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none" placeholder="Book Title" />
                <input type="text" value={newBookAuthor} onChange={e => setNewBookAuthor(e.target.value)} className="w-full p-4 bg-black/50 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none" placeholder="Author" />
                <div className="p-4 border border-dashed border-white/20 rounded-xl text-center"><p className="text-xs text-white/40 mb-2">Book PDF</p><input type="file" accept="application/pdf" onChange={e => setSelectedPdf(e.target.files[0])} className="text-xs text-white/70 w-full" /></div>
                <div className="p-4 border border-dashed border-white/20 rounded-xl text-center"><p className="text-xs text-white/40 mb-2">Cover Image</p><input type="file" accept="image/*" onChange={e => setSelectedCover(e.target.files[0])} className="text-xs text-white/70 w-full" /></div>
                <button disabled={isUploading} className="w-full bg-emerald-600 font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/50 hover:scale-[1.02] transition">{isUploading ? "Uploading..." : "Save Book"}</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;