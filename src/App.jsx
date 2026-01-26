import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, BookOpen, Trophy, Plus, X, UploadCloud, 
  MessageCircle, Lock, User, LogOut, Send, Trash2, Edit3, Pin, Flame, 
  Smile, CheckCircle, AlertCircle, Sparkles, Play, Camera, 
  Save, Layout, Menu, Activity, Heart, Award, BarChart2
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = 'https://cmbugolomogriwcqcdhk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtYnVnb2xvbW9ncml3Y3FjZGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDcyNzIsImV4cCI6MjA4MzYyMzI3Mn0.flvM9pSa0fbWiW56kcwOwwBKfqSXl10DVqt3Fp6AOD8';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PIN = "2026"; 
const PERMANENT_MEETING_LINK = "https://whereby.com/mindful-readers"; 

// STATIC ASSETS
const DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2428&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

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
  
  // Data States
  const [libraryBooks, setLibraryBooks] = useState([]); 
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [discussionTopic, setDiscussionTopic] = useState("Introduction");
  
  // UI States
  const [isUploading, setIsUploading] = useState(false); 
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Profile & Image View States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [viewImage, setViewImage] = useState(null); 
  const [tempAbout, setTempAbout] = useState("");
  const [tempGoal, setTempGoal] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  
  // Progress States
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [tempPage, setTempPage] = useState(0);

  // Upload States
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [selectedPdf, setSelectedPdf] = useState(null); 
  const [selectedCover, setSelectedCover] = useState(null);

  const chatBottomRef = useRef(null);

  // --- INITIALIZATION ---
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
    try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (!data) {
            const newProfile = { id: userId, email: userEmail, username: "Reader", streak_count: 1, last_seen: new Date(), about: "I am a mindful reader.", joining_goal: "To read more books." };
            await supabase.from('profiles').upsert([newProfile]);
            setProfile(newProfile);
        } else {
            const today = new Date().toDateString();
            const lastSeen = new Date(data.last_seen || new Date()).toDateString();
            let newStreak = data.streak_count || 1;
            if (today !== lastSeen) {
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                if (yesterday.toDateString() === lastSeen) newStreak += 1; else newStreak = 1;
                await supabase.from('profiles').update({ last_seen: new Date(), streak_count: newStreak }).eq('id', userId);
            }
            setProfile({ ...data, streak_count: newStreak });
            setTempAbout(data.about || "");
            setTempGoal(data.joining_goal || "");
            setTempUsername(data.username || "");
        }
    } catch (e) { console.error("Profile Error", e); }
  };

  useEffect(() => {
    if (session) {
      fetchBooks();
      fetchMessages();
      const channel = supabase.channel('public:messages').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => { 
            if(payload.eventType === 'UPDATE') setChatMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
            else if (payload.eventType === 'INSERT') setChatMessages(prev => { if (prev.find(m => m.id === payload.new.id)) return prev; return [...prev, payload.new]; }); 
            else if (payload.eventType === 'DELETE') setChatMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }).subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [session]);

  useEffect(() => { if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, activeTab]);

  // --- ACTIONS ---
  const showNotification = (msg, type = 'success') => { setNotification({ message: msg, type }); setTimeout(() => setNotification(null), 4000); };

  const handleAuth = async (e) => {
    e.preventDefault(); setIsUploading(true);
    let error;
    if (authMode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://my-book-club-rosy.vercel.app' }});
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

  const handleStartReading = async (book) => {
    const total = prompt(`How many pages are in "${book.title}"?`, "100");
    if (!total || isNaN(total)) return;
    const updates = { current_book_title: book.title, current_book_cover: book.cover, current_page: 0, total_pages: parseInt(total) };
    setProfile(prev => ({ ...prev, ...updates }));
    await supabase.from('profiles').update(updates).eq('id', session.user.id);
    showNotification("Started Reading: " + book.title);
    setActiveTab('dashboard');
  };

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    const newPage = parseInt(tempPage);
    if(newPage > (profile.total_pages || 100)) return showNotification("Page number too high!", 'error');
    setProfile(prev => ({ ...prev, current_page: newPage }));
    await supabase.from('profiles').update({ current_page: newPage }).eq('id', session.user.id);
    setShowProgressModal(false);
    showNotification("Progress Updated!");
  };

  const handleSaveProfile = async () => {
    setIsUploading(true);
    try {
        const updates = { about: tempAbout, joining_goal: tempGoal, username: tempUsername };
        await supabase.from('profiles').update(updates).eq('id', session.user.id);
        setProfile(prev => ({ ...prev, ...updates }));
        setIsEditingProfile(false);
        showNotification("Profile Updated Successfully!");
    } catch(e) { showNotification("Failed to update profile", "error"); } finally { setIsUploading(false); }
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
      fetchBooks(); setShowUploadForm(false); showNotification("Book Added!");
    } catch (err) { showNotification(err.message, 'error'); } finally { setIsUploading(false); }
  };

  const handleVote = async (book) => {
    const userId = session.user.id;
    let currentVoters = book.voted_by || [];
    const newVoters = currentVoters.includes(userId) ? currentVoters.filter(id => id !== userId) : [...currentVoters, userId];
    setLibraryBooks(prev => prev.map(b => b.id === book.id ? {...b, voted_by: newVoters} : b));
    await supabase.from('books').update({ voted_by: newVoters }).eq('id', book.id);
  };

  const handlePinMessage = async (msg) => {
      const newStatus = !msg.is_pinned;
      setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: newStatus } : m));
      await supabase.from('messages').update({ is_pinned: newStatus }).eq('id', msg.id);
  };
  const pinnedMessage = chatMessages.find(m => m.is_pinned);

  const formatMessageContent = (content) => {
    if (!content) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-bold underline break-all hover:text-indigo-300">{part}</a>;
      return part;
    });
  };

  const handleUpdateAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, avatar_url: objectUrl }));
    try {
      const fileName = `avatar-${Date.now()}-${session.user.id}`;
      await supabase.storage.from('avatars').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').upsert({ id: session.user.id, avatar_url: publicUrl });
      showNotification("Profile picture updated!", "success");
    } catch (error) { console.error("Error uploading avatar:", error); showNotification("Error updating profile", "error"); }
  };

  const handleDeleteBook = async (id) => { if(window.confirm("Delete book?")) { await supabase.from('books').delete().eq('id', id); fetchBooks(); }};
  const handleDeleteMessage = async (id) => { if(window.confirm("Delete msg?")) { setChatMessages(prev => prev.filter(m => m.id !== id)); await supabase.from('messages').delete().eq('id', id); }};
  const handleSendMessage = async (e) => { e.preventDefault(); if (!newMessage.trim() || !profile) return; const msgText = newMessage; setNewMessage(""); setShowEmoji(false); const tempId = Date.now(); setChatMessages(prev => [...prev, { id: tempId, content: msgText, user_id: session.user.id, username: profile.username, avatar_url: profile.avatar_url, created_at: new Date().toISOString(), pending: true }]); await supabase.from('messages').insert([{ content: msgText, user_id: session.user.id, username: profile.username || "Reader", avatar_url: profile.avatar_url }]); };
  async function fetchBooks() { const { data } = await supabase.from('books').select('*').order('id', { ascending: false }); setLibraryBooks(data || []); }
  async function fetchMessages() { const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }); setChatMessages(data || []); }
  const handleAdminToggle = () => { if (isAdmin) setIsAdmin(false); else if (window.prompt("Admin PIN:") === ADMIN_PIN) { setIsAdmin(true); showNotification("Admin Active"); }};

  // --- LOGIN SCREEN (Modern Glass) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#09090b] to-[#09090b]"></div>
        {notification && <div className="fixed top-6 left-0 right-0 text-center z-50"><span className="bg-emerald-500/90 backdrop-blur-md px-6 py-2 rounded-full font-bold shadow-lg border border-white/10">{notification.message}</span></div>}
        <div className="w-full max-w-sm relative z-10 bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl ring-1 ring-white/5">
           <div className="flex justify-center mb-8"><div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-4 rounded-2xl shadow-xl shadow-indigo-900/30"><BookOpen size={40} className="text-white" /></div></div>
           <h1 className="text-4xl font-black text-center mb-2 tracking-tight">Mindful<span className="text-indigo-400">Readers</span></h1>
           <p className="text-center text-zinc-400 mb-8 font-medium">Your Sanctuary for Knowledge</p>
           <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && <input type="text" placeholder="Choose a Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/5 focus:border-indigo-500 focus:outline-none text-white transition placeholder:text-zinc-600" required />}
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/5 focus:border-indigo-500 focus:outline-none text-white transition placeholder:text-zinc-600" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/5 focus:border-indigo-500 focus:outline-none text-white transition placeholder:text-zinc-600" required />
              <button disabled={isUploading} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition shadow-lg">{isUploading ? "Connecting..." : (authMode === 'login' ? "Enter Sanctuary" : "Join Club")}</button>
           </form>
           <div className="mt-8 text-center text-sm text-zinc-500"><button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-white font-bold hover:underline transition">{authMode === 'login' ? "Create Account" : "Sign In"}</button></div>
        </div>
      </div>
    );
  }

  // --- APP LAYOUT ---
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex overflow-hidden">
      
      {/* --- MODERN SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#09090b]/95 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-300 ease-in-out ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
                <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-900/20"><BookOpen size={20} className="text-white"/></div>
                <h1 className="text-xl font-bold tracking-tight">Mindful<span className="text-indigo-400">Readers</span></h1>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-2 flex-1">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-4 mb-2">Menu</h3>
                {[
                    { id: 'dashboard', icon: Layout, label: 'Dashboard' },
                    { id: 'profile', icon: User, label: 'My Profile' },
                    { id: 'library', icon: BookOpen, label: 'Library' },
                    { id: 'vote', icon: Trophy, label: 'Vote' },
                    { id: 'chat', icon: MessageCircle, label: 'Chat Room' }
                ].map((item) => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }} 
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-medium text-sm group ${activeTab === item.id ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                        <item.icon size={20} className={activeTab === item.id ? "text-black" : "text-zinc-500 group-hover:text-white transition"}/>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* User Mini Profile */}
            <div className="border-t border-white/5 pt-6">
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 hover:bg-white/10 transition cursor-pointer group" onClick={() => setActiveTab('profile')}>
                     <img src={profile?.avatar_url || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-indigo-500 transition" />
                     <div className="overflow-hidden flex-1">
                         <h3 className="font-bold text-sm truncate text-white">{profile?.username || "Reader"}</h3>
                         <p className="text-xs text-zinc-500">View Profile</p>
                     </div>
                 </div>
                 <div className="flex gap-2 mt-2">
                    <button onClick={handleAdminToggle} className={`flex-1 flex justify-center py-2 rounded-xl transition ${isAdmin ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}><Lock size={16} /></button>
                    <button onClick={handleLogout} className="flex-1 flex justify-center py-2 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"><LogOut size={16} /></button>
                 </div>
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 h-screen overflow-y-auto relative scrollbar-hide bg-[#09090b]">
        
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-30 bg-[#09090b]/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg"><BookOpen size={18}/></div>
                <h1 className="font-bold">Mindful</h1>
            </div>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 text-white"><Menu size={24}/></button>
        </div>

        {notification && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right border border-white/10 ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
            {notification.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-bold text-sm">{notification.message}</span>
        </div>}

        <div className="p-6 max-w-5xl mx-auto pb-20">
            
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                    {/* Main Feed Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* 1. HERO TRACKER CARD */}
                        <div className="bg-gradient-to-br from-indigo-900/50 to-[#09090b] border border-indigo-500/20 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full"></div>
                             
                             <div className="flex flex-col sm:flex-row gap-8 items-start relative z-10">
                                {profile?.current_book_cover && <img src={profile.current_book_cover} className="w-32 h-48 object-cover rounded-xl shadow-2xl border border-white/10 -rotate-3 hover:rotate-0 transition duration-500" />}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h3 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Play size={12} fill="currentColor"/> Now Reading</h3>
                                        <h2 className="text-3xl font-black text-white leading-tight">{profile?.current_book_title || "No Book Selected"}</h2>
                                    </div>
                                    
                                    {profile?.current_book_title ? (
                                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                            <div className="flex justify-between text-xs text-zinc-400 font-medium mb-2"><span>Page {profile.current_page}</span><span>{Math.round((profile.current_page / (profile.total_pages || 1)) * 100)}%</span></div>
                                            <div className="w-full bg-white/5 rounded-full h-2 mb-4 overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{width: `${(profile.current_page / (profile.total_pages || 1)) * 100}%`}}></div></div>
                                            <button onClick={() => { setTempPage(profile.current_page); setShowProgressModal(true); }} className="w-full bg-white text-black hover:bg-zinc-200 py-3 rounded-xl font-bold text-sm transition shadow-lg">Update Progress</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setActiveTab('library')} className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-xl font-bold text-sm transition shadow-lg">Choose from Library</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. COMMUNITY BUZZ FEED */}
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500"/> Community Buzz</h3>
                            <div className="bg-[#121214] border border-white/5 rounded-[2rem] p-6 space-y-4">
                                {chatMessages.slice(-3).reverse().map((msg, i) => (
                                    <div key={i} className="flex gap-4 items-start p-3 hover:bg-white/5 rounded-2xl transition border-b border-white/5 last:border-0">
                                        <img src={msg.avatar_url || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                        <div>
                                            <p className="text-sm text-zinc-300"><span className="font-bold text-white">{msg.username}</span> shared a thought in Chat:</p>
                                            <p className="text-zinc-500 text-sm mt-1 line-clamp-2">"{msg.content}"</p>
                                        </div>
                                    </div>
                                ))}
                                {chatMessages.length === 0 && <p className="text-zinc-500 text-sm italic">No recent activity. Be the first to start a discussion!</p>}
                                <button onClick={() => setActiveTab('chat')} className="w-full py-3 text-sm font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl transition mt-2">Join the Conversation →</button>
                            </div>
                        </div>
                    </div>

                    {/* Side Column (Stats & Live) */}
                    <div className="space-y-6">
                        <div className="bg-[#121214] border border-white/5 rounded-[2rem] p-8 text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4 tracking-widest">Your Consistency</h3>
                            <Flame size={56} className="text-orange-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)] group-hover:scale-110 transition"/>
                            <div className="text-5xl font-black text-white mb-1">{profile?.streak_count || 1}</div>
                            <p className="text-sm text-zinc-500 font-medium">Day Streak</p>
                        </div>
                        
                        <div className="bg-[#121214] border border-white/5 rounded-[2rem] p-8 text-center">
                            <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4 tracking-widest">Live Session</h3>
                            <button onClick={() => window.open(PERMANENT_MEETING_LINK, '_blank')} className="w-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 py-6 rounded-2xl font-bold transition flex flex-col items-center gap-3 group">
                                <Camera size={32} className="group-hover:scale-110 transition"/>
                                <span>Join Live Room</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROFILE TAB (The "Premium" Upgrade) */}
            {activeTab === 'profile' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header Image / Banner - CURATED STATIC IMAGE */}
                    <div className="h-72 rounded-[2.5rem] mb-16 relative shadow-2xl border border-white/5 overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent z-10"></div>
                        <img src={DEFAULT_COVER_IMAGE} className="w-full h-full object-cover contrast-125 brightness-75 group-hover:scale-105 transition duration-700"/>
                        
                        {/* BIG PROFILE PICTURE */}
                        <div className="absolute -bottom-14 left-10 z-20">
                            <div className="relative group/avatar">
                                <img 
                                    src={profile?.avatar_url || "https://via.placeholder.com/150"} 
                                    onClick={() => setViewImage(profile.avatar_url)} 
                                    className="w-40 h-40 rounded-[2rem] border-[6px] border-[#09090b] object-cover shadow-2xl cursor-pointer transition transform hover:scale-105 hover:rotate-2"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 px-4 mb-12">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:pl-48 gap-4">
                            <div>
                                {isEditingProfile ? (
                                    <input value={tempUsername} onChange={e => setTempUsername(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-3xl font-black text-white focus:outline-none focus:border-indigo-500 w-full" placeholder="Username" />
                                ) : (
                                    <h2 className="text-4xl font-black tracking-tight flex items-center gap-2">{profile?.username || "Reader"} <Award size={24} className="text-yellow-500 fill-yellow-500 drop-shadow-lg"/></h2>
                                )}
                                <p className="text-zinc-500 font-medium mt-2 flex items-center gap-4">
                                    <span>Joined 2026</span>
                                    <span className="flex items-center gap-1 text-orange-500"><Flame size={16} fill="currentColor"/> {profile?.streak_count || 0} Day Streak</span>
                                </p>
                            </div>
                            
                            {/* EDIT BUTTONS */}
                            {isEditingProfile ? (
                                <button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-xl font-bold shadow-lg transition flex items-center gap-2 text-white"><Save size={18}/> Save Changes</button>
                            ) : (
                                <button onClick={() => setIsEditingProfile(true)} className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-xl font-bold shadow-lg transition flex items-center gap-2 text-white border border-white/10"><Edit3 size={18}/> Edit Profile</button>
                            )}
                        </div>
                    </div>

                    {/* --- NEW FEATURE: STATS BAR --- */}
                    <div className="grid grid-cols-2 gap-6 mb-12 sm:pl-48">
                        <div className="bg-[#121214] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                            <div className="bg-indigo-500/20 p-3 rounded-xl text-indigo-400"><BookOpen size={24} /></div>
                            <div><h3 className="text-2xl font-black">{libraryBooks.length > 0 ? "5+" : "0"}</h3><p className="text-xs text-zinc-500 font-bold uppercase">Books Read</p></div>
                        </div>
                        <div className="bg-[#121214] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                            <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-400"><BarChart2 size={24} /></div>
                            <div><h3 className="text-2xl font-black">{profile?.current_page || 0}</h3><p className="text-xs text-zinc-500 font-bold uppercase">Pages Logged</p></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* About Section */}
                        <div className="bg-[#121214] border border-white/5 p-8 rounded-[2rem] h-full">
                            <h3 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2"><User size={14}/> About Me</h3>
                            {isEditingProfile ? (
                                <textarea value={tempAbout} onChange={e => setTempAbout(e.target.value)} className="w-full bg-black/30 rounded-2xl p-4 text-white border border-white/10 h-40 focus:outline-none focus:border-indigo-500 transition resize-none" placeholder="Tell the club about yourself..."></textarea>
                            ) : (
                                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-lg">{profile?.about || "I am a mindful reader."}</p>
                            )}
                        </div>

                        {/* Goals Section */}
                        <div className="bg-[#121214] border border-white/5 p-8 rounded-[2rem] h-full">
                            <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2"><Trophy size={14}/> Reading Goals</h3>
                            {isEditingProfile ? (
                                <textarea value={tempGoal} onChange={e => setTempGoal(e.target.value)} className="w-full bg-black/30 rounded-2xl p-4 text-white border border-white/10 h-40 focus:outline-none focus:border-emerald-500 transition resize-none" placeholder="What do you want to achieve?"></textarea>
                            ) : (
                                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-lg">{profile?.joining_goal || "To read more books this year."}</p>
                            )}
                        </div>
                    </div>

                    {/* --- NEW FEATURE: ACHIEVEMENTS (Placeholders for now) --- */}
                    <div className="mt-8 bg-[#121214] border border-white/5 p-8 rounded-[2rem]">
                        <h3 className="text-zinc-500 text-xs font-bold uppercase mb-6 tracking-widest flex items-center gap-2"><Award size={16}/> Achievements</h3>
                        <div className="flex flex-wrap gap-4">
                            {[{label: "Club Member", active: true, color: "text-yellow-500 bg-yellow-500/10"}, {label: "7-Day Streak", active: profile?.streak_count >= 7, color: "text-orange-500 bg-orange-500/10"}, {label: "First Voter", active: false, color: "text-indigo-500 bg-indigo-500/10"}, {label: "Bookworm", active: false, color: "text-emerald-500 bg-emerald-500/10"}].map((badge, i) => (
                                <div key={i} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border ${badge.active ? `${badge.color} border-transparent` : 'bg-white/5 text-zinc-600 border-white/5 grayscale opacity-50'}`}>
                                    <Award size={14} fill={badge.active ? "currentColor" : "none"}/ > {badge.label}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {isEditingProfile && (
                        <div className="mt-8 bg-[#121214] border border-white/5 p-8 rounded-[2rem]">
                            <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4 tracking-widest">Update Profile Picture</h3>
                            <input type="file" accept="image/*" onChange={handleUpdateAvatar} className="w-full text-sm text-zinc-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 transition"/>
                        </div>
                    )}
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <div className="h-[calc(100vh-6rem)] flex flex-col bg-[#121214] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center backdrop-blur-md">
                        <div><h2 className="font-bold text-lg">Club Chat</h2><p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Topic: {discussionTopic}</p></div>
                        {isAdmin && <button onClick={() => {const t = prompt("New Topic"); if(t) setDiscussionTopic(t)}} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition"><Edit3 size={16} className="text-zinc-400"/></button>}
                    </div>
                    {pinnedMessage && (
                        <div className="bg-indigo-500/10 p-4 border-l-4 border-indigo-500 flex justify-between items-center backdrop-blur-sm">
                            <p className="text-sm text-indigo-200 line-clamp-1 font-medium"><Pin size={14} className="inline mr-2 fill-current"/>{pinnedMessage.content}</p>
                            {isAdmin && <button onClick={() => handlePinMessage(pinnedMessage)}><X size={16} className="text-white/50 hover:text-white"/></button>}
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {chatMessages.map(msg => (
                             <div key={msg.id} className={`flex gap-4 ${msg.user_id === session.user.id ? 'flex-row-reverse' : ''}`}>
                                 <img src={msg.avatar_url || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full bg-zinc-800 object-cover border border-white/10"/>
                                 <div className={`p-4 rounded-2xl max-w-[80%] text-sm shadow-md ${msg.user_id === session.user.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#1a1d23] text-zinc-200 rounded-tl-none border border-white/5'}`}>
                                     <div className="flex justify-between items-center gap-4 mb-2"><span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{msg.username}</span>{isAdmin && <button onClick={() => handlePinMessage(msg)}><Pin size={12} className={msg.is_pinned ? "text-indigo-300 fill-current" : "text-zinc-600"}/></button>}</div>
                                     <div className="break-words leading-relaxed">{formatMessageContent(msg.content)}</div>
                                 </div>
                             </div>
                        ))}
                        <div ref={chatBottomRef} />
                    </div>
                    <div className="p-4 bg-black/20 border-t border-white/5">
                        <form onSubmit={handleSendMessage} className="flex gap-3">
                             <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-[#1a1d23] border border-white/5 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-indigo-500 transition text-white placeholder:text-zinc-600"/>
                             <button className="bg-indigo-600 px-6 rounded-xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20"><Send size={20}/></button>
                        </form>
                    </div>
                </div>
            )}

            {/* LIBRARY TAB */}
            {activeTab === 'library' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-end">
                        <div><h2 className="text-3xl font-black tracking-tight">Library</h2><p className="text-zinc-500 mt-1">{libraryBooks.length} Books Available</p></div>
                        {isAdmin && <button onClick={() => setShowUploadForm(true)} className="bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-lg"><Plus size={18}/> Add Book</button>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                         {libraryBooks.map(book => (
                            <div key={book.id} className="group bg-[#121214] border border-white/5 rounded-[1.5rem] p-4 hover:border-indigo-500/30 hover:-translate-y-1 transition duration-300 shadow-xl">
                                <div className="aspect-[2/3] bg-black/50 rounded-2xl mb-4 overflow-hidden relative shadow-lg">
                                    <img src={book.cover} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                    {isAdmin && <button onClick={(e) => { e.preventDefault(); handleDeleteBook(book.id); }} className="absolute top-2 right-2 bg-red-500/90 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg"><Trash2 size={16}/></button>}
                                </div>
                                <h3 className="font-bold text-sm line-clamp-1 mb-1 text-white">{book.title}</h3>
                                <p className="text-xs text-zinc-500 mb-4">{book.author}</p>
                                <div className="flex flex-col gap-2">
                                     <button onClick={() => handleStartReading(book)} className="w-full bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white py-3 rounded-xl text-xs font-bold uppercase transition">Track Reading</button>
                                     <a href={book.pdf_url} target="_blank" className="text-center text-xs text-zinc-500 hover:text-white transition py-2">Read PDF</a>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
            )}
            
            {/* VOTE TAB */}
            {activeTab === 'vote' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
                    <h2 className="text-3xl font-black mb-8 text-center">Vote for Next Month</h2>
                    {libraryBooks.sort((a,b) => ((b.voted_by?.length || 0) - (a.voted_by?.length || 0))).map((book, index) => (
                        <div key={book.id} className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex items-center gap-6 hover:bg-white/5 transition group">
                             <div className={`text-4xl font-black w-12 text-center ${index === 0 ? 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'text-zinc-700'}`}>#{index + 1}</div>
                             <img src={book.cover} className="w-16 h-24 object-cover rounded-xl shadow-lg group-hover:scale-105 transition"/>
                             <div className="flex-1">
                                 <h3 className="font-bold text-lg mb-1">{book.title}</h3>
                                 <p className="text-sm text-zinc-500 font-medium">{book.voted_by?.length || 0} Votes</p>
                             </div>
                             <button onClick={() => handleVote(book)} className={`px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg ${book.voted_by?.includes(session.user.id) ? 'bg-indigo-600 text-white' : 'bg-[#1a1d23] text-zinc-400 hover:bg-white hover:text-black'}`}>
                                 {book.voted_by?.includes(session.user.id) ? "Voted" : "Vote"}
                             </button>
                        </div>
                    ))}
                </div>
            )}

        </div>
      </main>

      {/* --- MODALS (Glassmorphism) --- */}
      {viewImage && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-8 animate-in fade-in" onClick={() => setViewImage(null)}>
                <button className="absolute top-6 right-6 text-white/50 hover:text-white p-3 rounded-full bg-white/10 transition"><X size={24}/></button>
                <img src={viewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}/>
            </div>
      )}

      {showProgressModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-[#121214] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 text-center shadow-2xl">
                    <h3 className="text-xl font-bold mb-2">Update Progress</h3>
                    <p className="text-zinc-500 mb-8 text-sm">Reading <b>{profile.current_book_title}</b></p>
                    <div className="text-6xl font-black mb-8 text-indigo-500">{tempPage}</div>
                    <input type="range" min="0" max={profile.total_pages || 100} value={tempPage} onChange={(e) => setTempPage(e.target.value)} className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer mb-8"/>
                    <button onClick={handleUpdateProgress} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl mb-3 hover:scale-[1.02] transition shadow-lg shadow-indigo-500/20">Save Progress</button>
                    <button onClick={() => setShowProgressModal(false)} className="text-zinc-500 text-sm hover:text-white transition">Cancel</button>
                </div>
            </div>
      )}
      
      {showUploadForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-[#121214] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative">
              <button onClick={() => setShowUploadForm(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={24}/></button>
              <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><UploadCloud size={24} className="text-indigo-500"/> Add to Library</h3>
              <form onSubmit={handleUploadBook} className="space-y-4">
                <input type="text" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} className="w-full p-4 bg-black/20 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 outline-none transition" placeholder="Book Title" />
                <input type="text" value={newBookAuthor} onChange={e => setNewBookAuthor(e.target.value)} className="w-full p-4 bg-black/20 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 outline-none transition" placeholder="Author" />
                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center hover:bg-white/5 transition cursor-pointer"><p className="text-xs text-zinc-500 mb-2 font-bold uppercase">Book PDF</p><input type="file" accept="application/pdf" onChange={e => setSelectedPdf(e.target.files[0])} className="text-xs text-zinc-400 w-full" /></div>
                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center hover:bg-white/5 transition cursor-pointer"><p className="text-xs text-zinc-500 mb-2 font-bold uppercase">Cover Image</p><input type="file" accept="image/*" onChange={e => setSelectedCover(e.target.files[0])} className="text-xs text-zinc-400 w-full" /></div>
                <button disabled={isUploading} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition shadow-lg mt-4">{isUploading ? "Uploading..." : "Save Book"}</button>
              </form>
            </div>
          </div>
      )}

    </div>
  );
};

export default App;