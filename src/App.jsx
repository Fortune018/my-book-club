import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, BookOpen, Trophy, Plus, X, UploadCloud, 
  MessageCircle, Mic, MicOff, Camera, CameraOff, PhoneOff, 
  Lock, ExternalLink, Image as ImageIcon, Sparkles, User,
  MoreHorizontal, Heart, Send, Trash2, Edit3, Pin
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = 'https://cmbugolomogriwcqcdhk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtYnVnb2xvbW9ncml3Y3FjZGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDcyNzIsImV4cCI6MjA4MzYyMzI3Mn0.flvM9pSa0fbWiW56kcwOwwBKfqSXl10DVqt3Fp6AOD8';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PIN = "2026"; 

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Data States
  const [libraryBooks, setLibraryBooks] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); 
  
  // Chat States (Fable Feature)
  const [discussionTopic, setDiscussionTopic] = useState("Introduction: What are your first impressions?");
  
  // Upload Form States
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [selectedPdf, setSelectedPdf] = useState(null); 
  const [selectedCover, setSelectedCover] = useState(null);

  // Video Call States
  const [isCallActive, setIsCallActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // --- 1. FETCH BOOKS ---
  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('id', { ascending: false });

    if (error) console.log('Error fetching books:', error);
    else setLibraryBooks(data || []);
    setIsLoading(false);
  }

  // --- 2. UPLOAD LOGIC ---
  const handleUploadBook = async (e) => {
    e.preventDefault();
    if (!newBookTitle || !selectedPdf) return alert("Please select a PDF file!");
    
    setIsUploading(true);

    try {
      const pdfName = `pdf-${Date.now()}-${selectedPdf.name.replace(/\s/g, '_')}`;
      const { error: pdfError } = await supabase.storage.from('book-files').upload(pdfName, selectedPdf);
      if (pdfError) throw pdfError;
      const { data: { publicUrl: pdfUrl } } = supabase.storage.from('book-files').getPublicUrl(pdfName);

      let coverUrl = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=60";
      if (selectedCover) {
        const coverName = `img-${Date.now()}-${selectedCover.name.replace(/\s/g, '_')}`;
        const { error: coverError } = await supabase.storage.from('book-files').upload(coverName, selectedCover);
        if (coverError) throw coverError;
        const { data: { publicUrl: realCoverUrl } } = supabase.storage.from('book-files').getPublicUrl(coverName);
        coverUrl = realCoverUrl;
      }

      const { error: dbError } = await supabase
        .from('books')
        .insert([{ title: newBookTitle, author: newBookAuthor, cover: coverUrl, pdf_url: pdfUrl }]);

      if (dbError) throw dbError;

      fetchBooks();
      setShowUploadForm(false); 
      setNewBookTitle(""); setNewBookAuthor("");
      setSelectedPdf(null); setSelectedCover(null);
      alert("Book Uploaded Successfully!");

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- 3. DELETE LOGIC ---
  const handleDeleteBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (!error) setLibraryBooks(libraryBooks.filter(book => book.id !== id));
  };

  // --- 4. VIDEO CALL ---
  const startCall = async () => {
    try {
      setIsCallActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { 
      alert("Could not access camera. Please allow permissions."); 
      setIsCallActive(false); 
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
  };

  // --- 5. TOPIC UPDATE (FABLE FEATURE) ---
  const handleUpdateTopic = () => {
    const newTopic = window.prompt("Set new discussion topic:", discussionTopic);
    if (newTopic) setDiscussionTopic(newTopic);
  };

  const handleAdminToggle = () => {
    if (isAdmin) setIsAdmin(false);
    else {
      if (window.prompt("Enter Admin PIN:") === ADMIN_PIN) setIsAdmin(true);
      else alert("Incorrect PIN");
    }
  };

  const bgStyle = "min-h-screen bg-black font-sans pb-28 text-white";

  return (
    <div className={bgStyle}>
      {!isCallActive && (
        <nav className="fixed top-0 left-0 right-0 z-30 bg-black/50 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg"><BookOpen size={16} fill="white" /></div>
            <h1 className="text-lg font-bold tracking-tight">Mindful<span className="text-indigo-400">Readers</span></h1>
          </div>
          <button onClick={handleAdminToggle} className={`text-[10px] px-3 py-1.5 rounded-full border font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${isAdmin ? 'bg-indigo-600 border-indigo-500 shadow-glow' : 'border-white/20 text-white/50'}`}>
            <Lock size={10} /> {isAdmin ? "Admin" : "Member"}
          </button>
        </nav>
      )}

      <main className={`pt-20 px-4 max-w-lg mx-auto relative ${isCallActive ? 'p-0 max-w-full h-screen overflow-hidden' : ''}`}>

        {/* --- FIXED VIDEO CALL UI --- */}
        {isCallActive && (
           <div className="fixed inset-0 bg-black z-50 flex flex-col">
             {/* HEADER */}
             <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> 
                    <span className="text-xs font-bold">Live</span>
                </div>
             </div>
             
             {/* VIDEO */}
             <div className="flex-1 relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <User size={32} className="text-white/50 mx-auto mb-2"/>
                        <p className="text-white/80 font-bold">You are the Host</p>
                        <p className="text-white/40 text-xs">Waiting for others...</p>
                    </div>
                </div>
             </div>

             {/* CONTROLS - FIXED HIGH FROM BOTTOM */}
             <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-8 z-50 px-8">
               <button onClick={() => setMicOn(!micOn)} className={`p-5 rounded-full shadow-2xl transition-all ${micOn ? 'bg-gray-800/80 backdrop-blur-md text-white' : 'bg-white text-black'}`}>{micOn ? <Mic size={24}/> : <MicOff size={24}/>}</button>
               
               {/* END BUTTON - BIG RED ONE */}
               <button onClick={endCall} className="bg-red-500 p-6 rounded-2xl hover:scale-105 transition shadow-red-900/40 shadow-xl border-4 border-black"><PhoneOff size={32} fill="white" /></button>
               
               <button onClick={() => setCameraOn(!cameraOn)} className={`p-5 rounded-full shadow-2xl transition-all ${cameraOn ? 'bg-gray-800/80 backdrop-blur-md text-white' : 'bg-white text-black'}`}>{cameraOn ? <Camera size={24}/> : <CameraOff size={24}/>}</button>
             </div>
           </div>
        )}

        {/* --- LIBRARY --- */}
        {!isCallActive && activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end px-1">
               <div><h2 className="text-3xl font-bold text-white tracking-tight">Library</h2><p className="text-white/40 text-sm mt-1">Explore {libraryBooks.length} titles</p></div>
               {isAdmin && <button onClick={() => setShowUploadForm(true)} className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-white/10"><Plus size={16}/> Add</button>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
               {libraryBooks.map(book => (
                  <div key={book.id} className="group relative">
                    <div className="aspect-[2/3] bg-gray-900 rounded-xl mb-3 relative overflow-hidden shadow-2xl border border-white/5 group-hover:border-white/20 transition-all">
                      <img src={book.cover} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-500" alt="cover"/>
                      <a href={book.pdf_url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition duration-300">
                        <span className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition duration-300"><BookOpen size={14}/> Read</span>
                      </a>
                      {isAdmin && (
                        <button onClick={(e) => { e.preventDefault(); handleDeleteBook(book.id); }} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:scale-110 shadow-lg z-20"><Trash2 size={14}/></button>
                      )}
                    </div>
                    <h3 className="font-bold text-base leading-tight">{book.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{book.author}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* --- VOTE TAB --- */}
        {!isCallActive && activeTab === 'vote' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <h2 className="text-3xl font-bold px-1">Vote Next</h2>
                <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-[2rem] border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div><h3 className="font-bold text-xl">The Psychology of Money</h3><p className="text-indigo-400 text-sm">Morgan Housel</p></div>
                            <Trophy className="text-yellow-400" size={24}/>
                        </div>
                        <div className="w-full bg-gray-800 h-3 rounded-full mb-3 overflow-hidden"><div className="bg-indigo-500 h-full w-[75%] rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div></div>
                        <div className="flex justify-between text-xs text-gray-400 mb-6"><span>15 Votes</span><span>75%</span></div>
                        <button className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm hover:scale-[1.02] transition shadow-lg">Vote for this Book</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- CHAT TAB (FABLE FEATURE: TOPIC) --- */}
        {!isCallActive && activeTab === 'chat' && (
            <div className="flex flex-col h-[75vh] animate-in slide-in-from-right duration-300">
                <h2 className="text-3xl font-bold px-1 mb-4">Discussion</h2>
                
                {/* THE PINNED TOPIC (FABLE STEAL) */}
                <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-2xl mb-4 relative">
                   <div className="flex items-center gap-2 mb-1">
                      <Pin size={12} className="text-indigo-400"/>
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Current Topic</span>
                   </div>
                   <p className="text-sm font-medium text-indigo-100 pr-6">"{discussionTopic}"</p>
                   {isAdmin && (
                     <button onClick={handleUpdateTopic} className="absolute top-4 right-4 text-indigo-400 hover:text-white"><Edit3 size={14}/></button>
                   )}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto mb-4 scrollbar-hide">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">S</div>
                        <div className="bg-gray-900 p-4 rounded-2xl rounded-tl-none border border-white/10"><p className="text-xs text-indigo-400 font-bold mb-1">Sarah</p><p className="text-sm text-gray-200">Chapter 3 was insane! 🤯</p></div>
                    </div>
                </div>
                <div className="flex gap-2 bg-gray-900 p-2 rounded-2xl border border-white/10 pl-4">
                    <input type="text" placeholder="Share your thoughts..." className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600" />
                    <button className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 transition"><Send size={18}/></button>
                </div>
            </div>
        )}

        {/* --- DASHBOARD --- */}
        {!isCallActive && activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in zoom-in duration-300">
             <div className="h-[40vh] bg-gradient-to-br from-indigo-600 to-purple-800 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-end shadow-2xl">
               <img src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
               <div className="relative z-10">
                   <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-xs font-bold mb-4 text-white/90"><Sparkles size={12} className="text-yellow-400"/> Daily Streak: 12</div>
                   <h2 className="text-4xl font-bold text-white mb-2 leading-tight">Keep up the<br/>momentum.</h2>
                   <button onClick={() => setActiveTab('library')} className="mt-4 bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition shadow-xl">Continue Reading</button>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setActiveTab('vote')} className="bg-gray-900 p-6 rounded-3xl border border-white/5 hover:border-indigo-500/50 transition group">
                 <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Trophy size={24}/></div>
                 <span className="font-bold text-gray-200">Vote Next</span>
               </button>
               <button onClick={startCall} className="bg-gray-900 p-6 rounded-3xl border border-white/5 hover:border-green-500/50 transition group">
                 <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-green-500 group-hover:text-white transition-colors"><Camera size={24}/></div>
                 <span className="font-bold text-gray-200">Join Live</span>
               </button>
             </div>
          </div>
        )}

        {/* --- UPLOAD MODAL --- */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-gray-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-8 relative animate-in slide-in-from-bottom duration-300">
              <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-6 sm:hidden"></div>
              <h3 className="text-2xl font-bold mb-6">New Upload</h3>
              <form onSubmit={handleUploadBook} className="space-y-4">
                <div className="space-y-4">
                    <input type="text" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} className="w-full p-4 bg-black rounded-2xl border border-white/10 text-white focus:border-indigo-500 transition outline-none font-medium" placeholder="Book Title" />
                    <input type="text" value={newBookAuthor} onChange={e => setNewBookAuthor(e.target.value)} className="w-full p-4 bg-black rounded-2xl border border-white/10 text-white focus:border-indigo-500 transition outline-none font-medium" placeholder="Author" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                        <input type="file" accept="application/pdf" onChange={e => setSelectedPdf(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                        <div className={`h-24 bg-black rounded-2xl border border-dashed ${selectedPdf ? 'border-green-500 bg-green-900/10' : 'border-white/20'} flex flex-col items-center justify-center gap-2 transition`}>
                            <UploadCloud size={20} className={selectedPdf ? 'text-green-500' : 'text-gray-500'}/>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{selectedPdf ? 'PDF Added' : 'PDF'}</span>
                        </div>
                    </div>
                    <div className="relative group">
                        <input type="file" accept="image/*" onChange={e => setSelectedCover(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                        <div className={`h-24 bg-black rounded-2xl border border-dashed ${selectedCover ? 'border-green-500 bg-green-900/10' : 'border-white/20'} flex flex-col items-center justify-center gap-2 transition`}>
                            <ImageIcon size={20} className={selectedCover ? 'text-green-500' : 'text-gray-500'}/>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{selectedCover ? 'Img Added' : 'Cover'}</span>
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={isUploading} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-white/10 disabled:opacity-50 mt-4">
                  {isUploading ? "Uploading..." : "Publish to Library"}
                </button>
                <button type="button" onClick={() => setShowUploadForm(false)} className="w-full text-center text-gray-500 text-sm font-medium py-2">Cancel</button>
              </form>
            </div>
          </div>
        )}

        {/* --- BOTTOM NAV --- */}
        {!isCallActive && (
          <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 flex justify-around p-2 pb-8 z-30">
            {[
              { id: 'dashboard', icon: Home, label: 'Home' },
              { id: 'library', icon: BookOpen, label: 'Library' },
              { id: 'vote', icon: Trophy, label: 'Vote' },
              { id: 'chat', icon: MessageCircle, label: 'Chat' },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 w-20 ${activeTab === tab.id ? 'bg-white/10 text-white scale-105' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;