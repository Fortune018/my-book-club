import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, BookOpen, Trophy, Plus, X, UploadCloud, 
  MessageCircle, Lock, User, LogOut, Send, Trash2, Edit3, Pin, Flame, 
  Smile, CheckCircle, AlertCircle, Sparkles, Play, Camera, 
  Save, Layout, Menu
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = 'https://cmbugolomogriwcqcdhk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtYnVnb2xvbW9ncml3Y3FjZGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDcyNzIsImV4cCI6MjA4MzYyMzI3Mn0.flvM9pSa0fbWiW56kcwOwwBKfqSXl10DVqt3Fp6AOD8';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PIN = "2026"; 
const PERMANENT_MEETING_LINK = "https://whereby.com/mindful-readers"; 

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
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false); // For mobile toggle
  
  // Profile & Image View States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [viewImage, setViewImage] = useState(null); // The URL of the image to show BOLD
  const [tempAbout, setTempAbout] = useState("");
  const [tempGoal, setTempGoal] = useState("");
  
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
        const updates = { about: tempAbout, joining_goal: tempGoal, username: profile.username };
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

  const handleAdminStartLive = async () => {
    const msgText = `🎥 We are starting LIVE now! Click the 'Join Live' button on the dashboard.`;
    await supabase.from('messages').insert([{ content: msgText, user_id: session.user.id, username: profile.username || "Admin", avatar_url: profile.avatar_url, is_pinned: true }]);
    window.open(PERMANENT_MEETING_LINK, '_blank');
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

  // --- LOGIN SCREEN (Unchanged) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {notification && <div className="fixed top-6 left-0 right-0 text-center z-50"><span className="bg-emerald-500 px-6 py-2 rounded-full font-bold shadow-lg">{notification.message}</span></div>}
        <div className="w-full max-w-sm relative z-10 bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
           <div className="flex justify-center mb-6"><div className="bg-indigo-600 p-4 rounded-2xl shadow-lg"><BookOpen size={40} className="text-white" /></div></div>
           <h1 className="text-3xl font-black text-center mb-2">Mindful<span className="text-indigo-400">Readers</span></h1>
           <p className="text-center text-white/50 mb-8 font-medium">Join the Community</p>
           <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && <input type="text" placeholder="Choose a Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none text-white" required />}
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none text-white" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none text-white" required />
              <button disabled={isUploading} className="w-full bg-indigo-600 font-bold py-4 rounded-xl hover:scale-[1.02] transition shadow-lg">{isUploading ? "Connecting..." : (authMode === 'login' ? "Enter Sanctuary" : "Join Club")}</button>
           </form>
           <div className="mt-8 text-center text-sm text-white/40"><button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-indigo-400 font-bold hover:text-white transition">{authMode === 'login' ? "Create Account" : "Sign In"}</button></div>
        </div>
      </div>
    );
  }

  // --- APP LAYOUT ---
  return (
    <div className="min-h-screen bg-[#0f1115] text-white font-sans flex overflow-hidden">
      
      {/* --- SIDEBAR (THE MENU BY THE SIDE) --- */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#1a1d23] border-r border-white/5 transform transition-transform duration-300 ease-in-out ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
                <div className="bg-indigo-600 p-2 rounded-xl"><BookOpen size={24} className="text-white"/></div>
                <h1 className="text-xl font-bold">Mindful<span className="text-indigo-400">Readers</span></h1>
            </div>

            {/* User Mini Profile */}
            <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 hover:bg-white/10 transition cursor-pointer" onClick={() => setActiveTab('profile')}>
                 <img src={profile?.avatar_url || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full object-cover border border-indigo-500/50" />
                 <div className="overflow-hidden">
                     <h3 className="font-bold text-sm truncate">{profile?.username || "Reader"}</h3>
                     <p className="text-xs text-white/40">View Profile</p>
                 </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-2 flex-1">
                {[
                    { id: 'dashboard', icon: Layout, label: 'Dashboard' },
                    { id: 'profile', icon: User, label: 'My Profile' },
                    { id: 'library', icon: BookOpen, label: 'Library' },
                    { id: 'vote', icon: Trophy, label: 'Vote' },
                    { id: 'chat', icon: MessageCircle, label: 'Chat Room' }
                ].map((item) => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
                        <item.icon size={20} />
                        <span className="font-medium text-sm">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Admin & Logout */}
            <div className="border-t border-white/5 pt-4 space-y-2">
                <button onClick={handleAdminToggle} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${isAdmin ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/30 hover:text-white'}`}>
                    <Lock size={18} /> <span className="text-sm">Admin Mode</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition">
                    <LogOut size={18} /> <span className="text-sm">Log Out</span>
                </button>
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 h-screen overflow-y-auto relative scrollbar-hide">
        
        {/* Mobile Header (Hamburger) */}
        <div className="md:hidden sticky top-0 z-30 bg-[#0f1115]/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg"><BookOpen size={18}/></div>
                <h1 className="font-bold">Mindful</h1>
            </div>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 text-white"><Menu size={24}/></button>
        </div>

        {notification && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            {notification.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-bold text-sm">{notification.message}</span>
        </div>}

        <div className="p-6 max-w-4xl mx-auto pb-20">
            
            {/* PROFILE TAB (Redesigned) */}
            {activeTab === 'profile' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header Image / Banner */}
                    <div className="h-48 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl mb-12 relative shadow-lg">
                        {/* THE BIG PROFILE PICTURE INTERACTION */}
                        <div className="absolute -bottom-10 left-8">
                            <div className="relative group">
                                <img 
                                    src={profile?.avatar_url || "https://via.placeholder.com/150"} 
                                    onClick={() => setViewImage(profile.avatar_url)} // CLICK TO VIEW BOLD
                                    className="w-32 h-32 rounded-full border-4 border-[#0f1115] object-cover shadow-2xl cursor-pointer transition transform hover:scale-105"
                                />
                                {/* Quick Edit Icon on Hover */}
                                <button onClick={() => setIsEditingProfile(true)} className="absolute bottom-2 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-500 transition border-2 border-[#0f1115]">
                                    <Edit3 size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 px-2 mb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold">{profile?.username || "Reader"}</h2>
                                <p className="text-white/50 text-sm">Joined 2026 • {profile?.streak_count || 0} Day Streak 🔥</p>
                            </div>
                            {isEditingProfile && <button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-full font-bold shadow-lg transition flex items-center gap-2"><Save size={16}/> Save Profile</button>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* About Section */}
                        <div className="bg-[#1a1d23] border border-white/5 p-6 rounded-3xl">
                            <h3 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><User size={14}/> About Me</h3>
                            {isEditingProfile ? (
                                <textarea value={tempAbout} onChange={e => setTempAbout(e.target.value)} className="w-full bg-black/20 rounded-xl p-4 text-white border border-white/10 h-32 focus:outline-none focus:border-indigo-500" placeholder="Tell the club about yourself..."></textarea>
                            ) : (
                                <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{profile?.about || "I am a mindful reader."}</p>
                            )}
                        </div>

                        {/* Goals Section */}
                        <div className="bg-[#1a1d23] border border-white/5 p-6 rounded-3xl">
                            <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Trophy size={14}/> Reading Goals</h3>
                            {isEditingProfile ? (
                                <textarea value={tempGoal} onChange={e => setTempGoal(e.target.value)} className="w-full bg-black/20 rounded-xl p-4 text-white border border-white/10 h-32 focus:outline-none focus:border-emerald-500" placeholder="What do you want to achieve?"></textarea>
                            ) : (
                                <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{profile?.joining_goal || "To read more books this year."}</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Image Upload Area only visible when editing */}
                    {isEditingProfile && (
                        <div className="mt-6 bg-[#1a1d23] border border-white/5 p-6 rounded-3xl">
                            <h3 className="text-white/50 text-xs font-bold uppercase mb-4">Update Profile Picture</h3>
                            <input type="file" accept="image/*" onChange={handleUpdateAvatar} className="w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"/>
                        </div>
                    )}
                </div>
            )}

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {/* Main Feed Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                            <div className="flex gap-6 items-start relative z-10">
                                {profile?.current_book_cover && <img src={profile.current_book_cover} className="w-24 h-36 object-cover rounded-lg shadow-2xl border border-white/10" />}
                                <div className="flex-1">
                                    <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Currently Reading</h3>
                                    <h2 className="text-3xl font-bold mb-4 leading-tight">{profile?.current_book_title || "No Book Selected"}</h2>
                                    {profile?.current_book_title && (
                                        <div>
                                            <div className="w-full bg-black/30 rounded-full h-3 mb-2 overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-1000" style={{width: `${(profile.current_page / (profile.total_pages || 1)) * 100}%`}}></div></div>
                                            <div className="flex justify-between text-xs text-white/60 font-medium mb-4"><span>Page {profile.current_page} of {profile.total_pages}</span><span>{Math.round((profile.current_page / (profile.total_pages || 1)) * 100)}%</span></div>
                                            <button onClick={() => { setTempPage(profile.current_page); setShowProgressModal(true); }} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full font-bold text-sm transition">Update Progress</button>
                                        </div>
                                    )}
                                    {!profile?.current_book_title && <button onClick={() => setActiveTab('library')} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-full font-bold text-sm transition">Choose from Library</button>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Side Column */}
                    <div className="space-y-6">
                        <div className="bg-[#1a1d23] border border-white/5 rounded-3xl p-6 text-center">
                            <h3 className="text-white/40 text-xs font-bold uppercase mb-4">Your Streak</h3>
                            <Flame size={48} className="text-orange-500 mx-auto mb-2"/>
                            <div className="text-4xl font-black text-white">{profile?.streak_count || 1}</div>
                            <p className="text-sm text-white/50">Days Active</p>
                        </div>
                        <div className="bg-[#1a1d23] border border-white/5 rounded-3xl p-6 text-center">
                            <h3 className="text-white/40 text-xs font-bold uppercase mb-4">Live Session</h3>
                            <button onClick={() => window.open(PERMANENT_MEETING_LINK, '_blank')} className="w-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 py-4 rounded-2xl font-bold transition flex flex-col items-center gap-2">
                                <Camera size={24}/>
                                <span>Join Live Room</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <div className="h-[calc(100vh-6rem)] flex flex-col bg-[#1a1d23] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <div><h2 className="font-bold">Club Chat</h2><p className="text-xs text-white/40">Topic: {discussionTopic}</p></div>
                        {isAdmin && <button onClick={() => {const t = prompt("New Topic"); if(t) setDiscussionTopic(t)}}><Edit3 size={16} className="text-white/30 hover:text-white"/></button>}
                    </div>
                    {pinnedMessage && (
                        <div className="bg-indigo-900/30 p-3 border-l-4 border-indigo-500 flex justify-between items-center">
                            <p className="text-sm text-indigo-200 line-clamp-1"><Pin size={12} className="inline mr-2"/>{pinnedMessage.content}</p>
                            {isAdmin && <button onClick={() => handlePinMessage(pinnedMessage)}><X size={14} className="text-white/50 hover:text-white"/></button>}
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.map(msg => (
                             <div key={msg.id} className={`flex gap-3 ${msg.user_id === session.user.id ? 'flex-row-reverse' : ''}`}>
                                 <img src={msg.avatar_url || "https://via.placeholder.com/40"} className="w-8 h-8 rounded-full bg-gray-700 object-cover"/>
                                 <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.user_id === session.user.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-white/90 rounded-tl-none'}`}>
                                     <div className="flex justify-between items-center gap-4 mb-1"><span className="text-[10px] font-bold opacity-50">{msg.username}</span>{isAdmin && <button onClick={() => handlePinMessage(msg)}><Pin size={10} className={msg.is_pinned ? "text-indigo-300" : "text-white/20"}/></button>}</div>
                                     <div className="break-words">{formatMessageContent(msg.content)}</div>
                                 </div>
                             </div>
                        ))}
                        <div ref={chatBottomRef} />
                    </div>
                    <div className="p-4 bg-black/20 border-t border-white/5">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                             <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition"/>
                             <button className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 transition"><Send size={18}/></button>
                        </form>
                    </div>
                </div>
            )}

            {/* LIBRARY TAB */}
            {activeTab === 'library' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold">Library</h2>
                        {isAdmin && <button onClick={() => setShowUploadForm(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition"><Plus size={16}/> Add Book</button>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                         {libraryBooks.map(book => (
                            <div key={book.id} className="group bg-[#1a1d23] border border-white/5 rounded-2xl p-3 hover:border-indigo-500/50 transition">
                                <div className="aspect-[2/3] bg-black/50 rounded-xl mb-3 overflow-hidden relative shadow-lg">
                                    <img src={book.cover} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                    {isAdmin && <button onClick={(e) => { e.preventDefault(); handleDeleteBook(book.id); }} className="absolute top-2 right-2 bg-red-600/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>}
                                </div>
                                <h3 className="font-bold text-sm line-clamp-1 mb-1">{book.title}</h3>
                                <div className="flex flex-col gap-2 mt-2">
                                     <button onClick={() => handleStartReading(book)} className="w-full bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white py-2 rounded-lg text-xs font-bold uppercase transition">Track</button>
                                     <a href={book.pdf_url} target="_blank" className="text-center text-xs text-white/30 hover:text-white transition">Read PDF</a>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
            )}
            
            {/* VOTE TAB */}
            {activeTab === 'vote' && (
                <div className="max-w-2xl mx-auto space-y-4">
                    <h2 className="text-3xl font-bold mb-6">Vote for Next Month</h2>
                    {libraryBooks.sort((a,b) => ((b.voted_by?.length || 0) - (a.voted_by?.length || 0))).map((book, index) => (
                        <div key={book.id} className="bg-[#1a1d23] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition">
                             <div className={`text-2xl font-black w-8 text-center ${index === 0 ? 'text-yellow-500' : 'text-white/10'}`}>#{index + 1}</div>
                             <img src={book.cover} className="w-12 h-16 object-cover rounded-md"/>
                             <div className="flex-1">
                                 <h3 className="font-bold">{book.title}</h3>
                                 <p className="text-sm text-white/40">{book.voted_by?.length || 0} Votes</p>
                             </div>
                             <button onClick={() => handleVote(book)} className={`px-4 py-2 rounded-full font-bold text-sm transition ${book.voted_by?.includes(session.user.id) ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:text-white'}`}>Vote</button>
                        </div>
                    ))}
                </div>
            )}

        </div>
      </main>

      {/* --- MODALS --- */}
      {viewImage && (
            <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-8 animate-in fade-in" onClick={() => setViewImage(null)}>
                <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2 rounded-full bg-white/10"><X size={24}/></button>
                <img src={viewImage} className="max-w-full max-h-full rounded-lg shadow-2xl border-2 border-white/10" onClick={(e) => e.stopPropagation()}/>
            </div>
      )}

      {showProgressModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-[#1a1d23] border border-white/10 rounded-3xl w-full max-w-sm p-8 text-center">
                    <h3 className="text-xl font-bold mb-2">Update Progress</h3>
                    <p className="text-white/50 mb-6 text-sm">Reading <b>{profile.current_book_title}</b></p>
                    <div className="text-5xl font-black mb-6 text-indigo-400">{tempPage}</div>
                    <input type="range" min="0" max={profile.total_pages || 100} value={tempPage} onChange={(e) => setTempPage(e.target.value)} className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer mb-8"/>
                    <button onClick={handleUpdateProgress} className="w-full bg-indigo-600 font-bold py-3 rounded-xl mb-3">Save</button>
                    <button onClick={() => setShowProgressModal(false)} className="text-white/40 text-sm">Cancel</button>
                </div>
            </div>
      )}
      
      {showUploadForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-[#1a1d23] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative">
              <button onClick={() => setShowUploadForm(false)} className="absolute top-4 right-4 text-white/30 hover:text-white"><X size={20}/></button>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><UploadCloud size={20} className="text-indigo-500"/> Add Book</h3>
              <form onSubmit={handleUploadBook} className="space-y-4">
                <input type="text" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} className="w-full p-4 bg-black/20 rounded-xl border border-white/10 text-white" placeholder="Book Title" />
                <input type="text" value={newBookAuthor} onChange={e => setNewBookAuthor(e.target.value)} className="w-full p-4 bg-black/20 rounded-xl border border-white/10 text-white" placeholder="Author" />
                <div className="p-4 border border-dashed border-white/20 rounded-xl text-center"><p className="text-xs text-white/40 mb-2">Book PDF</p><input type="file" accept="application/pdf" onChange={e => setSelectedPdf(e.target.files[0])} className="text-xs text-white/70 w-full" /></div>
                <div className="p-4 border border-dashed border-white/20 rounded-xl text-center"><p className="text-xs text-white/40 mb-2">Cover Image</p><input type="file" accept="image/*" onChange={e => setSelectedCover(e.target.files[0])} className="text-xs text-white/70 w-full" /></div>
                <button disabled={isUploading} className="w-full bg-emerald-600 font-bold py-3 rounded-xl hover:scale-[1.02] transition">{isUploading ? "Uploading..." : "Save Book"}</button>
              </form>
            </div>
          </div>
      )}

    </div>
  );
};

export default App;