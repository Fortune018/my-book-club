import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2, MessageSquare, CheckCircle, BookOpen, Library, Video, 
  Plus, X, ArrowLeft, Mic, MicOff, Camera, CameraOff, PhoneOff, 
  UploadCloud, Users, Heart, Send, Flame, Award, Hand, Smile
} from 'lucide-react';

// --- MOCK DATA (6 Members for the Perfect Grid) ---
const INITIAL_MEMBERS = [
  { id: 1, name: "Sarah", status: "Listening", color: "bg-pink-600", handRaised: false },
  { id: 2, name: "Mike", status: "Speaking...", color: "bg-blue-600", handRaised: true },
  { id: 3, name: "Jessica", status: "Muted", color: "bg-purple-600", handRaised: false },
  { id: 4, name: "David", status: "Listening", color: "bg-yellow-600", handRaised: false },
  { id: 5, name: "Anita", status: "Listening", color: "bg-green-600", handRaised: false },
];

// --- ROBUST BOOK IMAGES ---
const SAMPLE_PDF = "https://pdfobject.com/pdf/sample.pdf";
const INITIAL_LIBRARY = [
  { id: 1, title: "Atomic Habits", author: "James Clear", cover: "https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=600&auto=format&fit=crop&q=60", pdfUrl: SAMPLE_PDF },
  { id: 2, title: "Psychology of Money", author: "Morgan Housel", cover: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop&q=60", pdfUrl: SAMPLE_PDF },
  { id: 3, title: "Rich Dad Poor Dad", author: "R. Kiyosaki", cover: "https://images.unsplash.com/photo-1554774853-719586f8c277?w=600&auto=format&fit=crop&q=60", pdfUrl: SAMPLE_PDF },
  { id: 4, title: "The Alchemist", author: "Paulo Coelho", cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=60", pdfUrl: SAMPLE_PDF },
];

const VOTING_OPTIONS = [
  { id: 1, title: "The Midnight Library", votes: 12, author: "Matt Haig" },
  { id: 2, title: "Project Hail Mary", votes: 8, author: "Andy Weir" },
  { id: 3, title: "Dune", votes: 4, author: "Frank Herbert" },
];

const INITIAL_CHATS = [
  { id: 1, user: "Sarah", text: "Has anyone finished Chapter 4 yet? It's mind-blowing! 🤯" },
  { id: 2, user: "Mike", text: "I'm halfway through. No spoilers please!" },
  { id: 3, user: "Jessica", text: "The symbolism in the second act is beautiful." },
];

const App = () => {
  const [activeTab, setActiveTab] = useState('library'); 
  const [isAdmin, setIsAdmin] = useState(true);
  
  // Data States
  const [libraryBooks, setLibraryBooks] = useState(INITIAL_LIBRARY);
  const [chatMessages, setChatMessages] = useState(INITIAL_CHATS);
  const [bookOptions, setBookOptions] = useState(VOTING_OPTIONS);
  const [newMessage, setNewMessage] = useState("");
  
  // Feature States
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); 
  const [readingBook, setReadingBook] = useState(null);

  // Video Call States
  const [isCallActive, setIsCallActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [reactions, setReactions] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // --- ACTIONS ---
  const startCall = async () => {
    try {
      setIsCallActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) { alert("Error accessing camera: " + err); setIsCallActive(false); }
  };

  const endCall = () => {
    setIsCallActive(false);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const toggleMic = () => { if (streamRef.current) { streamRef.current.getAudioTracks()[0].enabled = !micOn; setMicOn(!micOn); }};
  const toggleCamera = () => { if (streamRef.current) { streamRef.current.getVideoTracks()[0].enabled = !cameraOn; setCameraOn(!cameraOn); }};

  const triggerReaction = (emoji) => {
    const id = Date.now();
    setReactions([...reactions, { id, emoji, left: Math.random() * 80 + 10 }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const handleUploadBook = (e) => {
    e.preventDefault();
    if (!newBookTitle || !newBookAuthor) return;
    let bookUrl = SAMPLE_PDF;
    if (selectedFile) bookUrl = URL.createObjectURL(selectedFile);
    // Colorful placeholder for uploads
    const randomCover = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=60";
    setLibraryBooks([{ id: Date.now(), title: newBookTitle, author: newBookAuthor, cover: randomCover, pdfUrl: bookUrl }, ...libraryBooks]); 
    setShowUploadForm(false); setNewBookTitle(""); setNewBookAuthor(""); setSelectedFile(null);
  };

  const castVote = (id) => {
    setBookOptions(bookOptions.map(book => book.id === id ? { ...book, votes: book.votes + 1 } : book));
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setChatMessages([...chatMessages, { id: Date.now(), user: "You", text: newMessage }]);
    setNewMessage("");
  };

  // --- DARK THEME BACKGROUND ---
  const bgStyle = "min-h-screen bg-slate-950 font-sans pb-24 text-white";

  return (
    <div className={bgStyle}>
      
      {/* HEADER */}
      {!isCallActive && (
        <nav className="backdrop-blur-md bg-white/5 border-b border-white/10 p-4 sticky top-0 z-20 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2 text-white shadow-sm">
            <BookOpen size={20} className="text-indigo-400"/> Mindful Readers
          </h1>
          <button onClick={() => setIsAdmin(!isAdmin)} className={`text-[10px] px-3 py-1 rounded-full border transition font-bold uppercase tracking-wider ${isAdmin ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-white/30 text-white/70'}`}>
            {isAdmin ? "Admin Mode" : "Member Mode"}
          </button>
        </nav>
      )}

      <main className={`p-4 max-w-lg mx-auto relative ${isCallActive ? 'p-0 max-w-full h-screen overflow-hidden' : ''}`}>

        {/* --- 6-PERSON VIDEO GRID (3 COLUMNS = SQUARES) --- */}
        {isCallActive && (
           <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
             
             {/* HEADER */}
             <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
                <div className="text-white font-bold flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> 
                  Live Session
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setMyHandRaised(!myHandRaised)} className={`p-2 rounded-full transition ${myHandRaised ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}><Hand size={18}/></button>
                  <button onClick={() => triggerReaction("❤️")} className="p-2 rounded-full bg-white/10 text-red-400 hover:bg-white/20"><Heart size={18}/></button>
                  <button onClick={() => triggerReaction("👍")} className="p-2 rounded-full bg-white/10 text-yellow-400 hover:bg-white/20"><Smile size={18}/></button>
                </div>
             </div>

             {/* THE 3-COLUMN GRID (Fixes Aspect Ratio) */}
             <div className="flex-1 grid grid-cols-3 gap-1 p-1 pt-16 pb-24 content-start overflow-y-auto">
               
               {/* 1. YOU (Real Camera) */}
               <div className="bg-gray-900 relative aspect-square rounded-xl overflow-hidden border border-white/10">
                 <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                 <div className="absolute bottom-1 left-1 text-white text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">You</div>
                 {!cameraOn && <div className="absolute inset-0 flex items-center justify-center bg-gray-800"><CameraOff size={24} className="text-white/50"/></div>}
                 {myHandRaised && <div className="absolute top-2 right-2 bg-yellow-500 text-black p-1 rounded-full"><Hand size={14}/></div>}
                 
                 {/* Floating Reactions */}
                 {reactions.map(r => (
                   <div key={r.id} className="absolute bottom-0 text-2xl animate-[float_2s_ease-out_forwards]" style={{ left: `${r.left}%` }}>{r.emoji}</div>
                 ))}
               </div>

               {/* 2. THE MEMBERS (Fake Grid) */}
               {INITIAL_MEMBERS.map(member => (
                 <div key={member.id} className="bg-gray-900 relative aspect-square rounded-xl overflow-hidden border border-white/10 flex flex-col items-center justify-center group">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${member.color} mb-1 shadow-xl group-hover:scale-110 transition`}>
                      {member.name.charAt(0)}
                    </div>
                    {member.status === "Speaking..." && (
                      <div className="flex gap-0.5 h-3 items-end absolute bottom-6">
                        <div className="w-1 bg-green-400 animate-bounce h-2"></div>
                        <div className="w-1 bg-green-400 animate-bounce h-3 delay-75"></div>
                        <div className="w-1 bg-green-400 animate-bounce h-1 delay-150"></div>
                      </div>
                    )}
                    {member.handRaised && <div className="absolute top-2 right-2 bg-yellow-500 text-black p-1 rounded-full"><Hand size={14}/></div>}
                    <div className="absolute bottom-1 left-1 text-white text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1">
                       {member.status === "Muted" && <MicOff size={8} className="text-red-400"/>}
                       {member.name}
                    </div>
                 </div>
               ))}
             </div>
             
             {/* CONTROLS */}
             <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 z-20">
               <button onClick={toggleMic} className={`p-4 rounded-full transition shadow-xl backdrop-blur-xl border border-white/10 ${micOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-500 text-white'}`}>{micOn ? <Mic size={24}/> : <MicOff size={24}/>}</button>
               <button onClick={endCall} className="bg-red-600 text-white p-6 rounded-full shadow-2xl hover:bg-red-700 transition hover:scale-110 active:scale-95 border-4 border-gray-950"><PhoneOff size={32} fill="white" /></button>
               <button onClick={toggleCamera} className={`p-4 rounded-full transition shadow-xl backdrop-blur-xl border border-white/10 ${cameraOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-500 text-white'}`}>{cameraOn ? <Camera size={24}/> : <CameraOff size={24}/>}</button>
             </div>
           </div>
        )}

        {/* --- LIBRARY --- */}
        {!isCallActive && activeTab === 'library' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
               <div><h2 className="text-2xl font-bold text-white">My Bookshelf</h2><p className="text-white/50 text-xs">Explore your mind</p></div>
               {isAdmin && <button onClick={() => setShowUploadForm(true)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-1 shadow-lg shadow-indigo-900/50 transition"><Plus size={16}/> Add Book</button>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {libraryBooks.map(book => (
                <div key={book.id} className="group relative bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1">
                  <div className="w-full aspect-[2/3] rounded-lg mb-3 overflow-hidden shadow-lg relative bg-gray-800">
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                    <button onClick={() => { setReadingBook(book); setActiveTab('reader'); }} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/60 backdrop-blur-sm">
                      <span className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold shadow-xl">Read Now</span>
                    </button>
                  </div>
                  <h3 className="font-bold text-sm text-white leading-tight line-clamp-1">{book.title}</h3>
                  <p className="text-xs text-white/50 mt-1">{book.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- VOTING UI --- */}
        {!isCallActive && activeTab === 'vote' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="px-2"><h2 className="text-2xl font-bold text-white">Next Month's Read</h2><p className="text-white/50 text-xs">Cast your vote below</p></div>
             <div className="space-y-3">
               {bookOptions.map(book => (
                 <div key={book.id} className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                   <div><h3 className="font-bold text-white">{book.title}</h3><p className="text-xs text-white/50">by {book.author}</p></div>
                   <button onClick={() => castVote(book.id)} className="group flex items-center gap-2 bg-white/10 hover:bg-indigo-600 transition px-4 py-2 rounded-xl text-sm font-bold border border-white/5">
                     <Heart size={16} className={`text-indigo-400 group-hover:text-white group-hover:fill-current`} />{book.votes}
                   </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* --- CHAT UI --- */}
        {!isCallActive && activeTab === 'chat' && (
          <div className="flex flex-col h-[75vh] animate-in slide-in-from-right duration-300">
             <div className="px-2 mb-4"><h2 className="text-2xl font-bold text-white">Community Chat</h2><p className="text-white/50 text-xs">Live discussions</p></div>
             <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
               {chatMessages.map(msg => (
                 <div key={msg.id} className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${msg.user === 'You' ? 'ml-auto bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 backdrop-blur-md border border-white/5 text-gray-100 rounded-tl-none'}`}>
                   <p className={`text-[10px] font-bold mb-1 opacity-70 uppercase tracking-wide`}>{msg.user}</p><p>{msg.text}</p>
                 </div>
               ))}
             </div>
             <form onSubmit={sendMessage} className="flex gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 backdrop-blur-lg">
               <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Share your thoughts..." className="flex-1 bg-transparent text-white px-3 focus:outline-none placeholder:text-white/30"/>
               <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-500 transition"><Send size={18}/></button>
             </form>
          </div>
        )}

        {/* --- READER MODE --- */}
        {!isCallActive && activeTab === 'reader' && readingBook && (
          <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="bg-gray-800 text-white p-4 shadow-md flex items-center gap-4 border-b border-white/10">
               <button onClick={() => setActiveTab('library')} className="hover:bg-white/10 p-2 rounded-full"><ArrowLeft size={24}/></button>
               <div><h2 className="font-bold text-sm leading-tight">Reading: {readingBook.title}</h2></div>
            </div>
            <div className="flex-1 bg-gray-900 p-2">
               <iframe src={readingBook.pdfUrl} className="w-full h-full rounded-lg border border-white/10 bg-white" title="PDF Viewer"></iframe>
            </div>
          </div>
        )}

        {/* --- DASHBOARD --- */}
        {!isCallActive && activeTab === 'dashboard' && (
           <div className="space-y-6">
             <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-white/10">
               <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10"><BookOpen size={140} /></div>
               <div className="flex gap-2 mb-4">
                 <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><Flame size={12}/> 12 Day Streak</span>
                 <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><Award size={12}/> Top Reader</span>
               </div>
               <h2 className="text-3xl font-extrabold text-white mt-2 relative z-10">Welcome Back</h2>
               <p className="text-indigo-200 relative z-10 mb-6 text-sm">Ready to dive back in?</p>
               <button onClick={() => setActiveTab('library')} className="bg-white text-indigo-900 px-6 py-3 rounded-full font-bold text-sm shadow-xl hover:bg-gray-100 transition relative z-10">Resume Reading</button>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setActiveTab('vote')} className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition flex flex-col items-center gap-3 group">
                 <div className="bg-pink-500/20 p-3 rounded-full text-pink-400 group-hover:scale-110 transition"><Heart size={24}/></div><span className="font-bold text-gray-200 text-sm">Vote Next</span>
               </button>
               <button onClick={() => setActiveTab('live')} className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition flex flex-col items-center gap-3 group">
                 <div className="bg-green-500/20 p-3 rounded-full text-green-400 group-hover:scale-110 transition"><Video size={24}/></div><span className="font-bold text-gray-200 text-sm">Join Meet</span>
               </button>
             </div>
          </div>
        )}

        {!isCallActive && activeTab === 'live' && (
          <div className="text-center space-y-6 mt-10">
             <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
               <div className="bg-green-500/20 w-20 h-20 mx-auto rounded-full flex items-center justify-center text-green-400 mb-4 animate-pulse">
                 <Video size={40}/>
               </div>
               <h2 className="text-2xl font-bold text-white">Live Session</h2>
               <p className="text-white/50 text-sm mt-2">5 Members are online.</p>
               <button onClick={startCall} className="mt-8 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] transition">JOIN SESSION</button>
             </div>
          </div>
        )}

      </main>
      
      {/* --- UPLOAD MODAL --- */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-bounce-in text-white">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">Upload New Book</h3><button onClick={() => setShowUploadForm(false)} className="text-gray-400 hover:text-white"><X size={24}/></button></div>
            <form onSubmit={handleUploadBook} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 mb-1">BOOK TITLE</label><input type="text" value={newBookTitle} onChange={(e) => setNewBookTitle(e.target.value)} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white" placeholder="Book Name" /></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">AUTHOR</label><input type="text" value={newBookAuthor} onChange={(e) => setNewBookAuthor(e.target.value)} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white" placeholder="Author Name" /></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">PDF FILE</label><div className="relative"><input type="file" accept="application/pdf" onChange={(e) => { if(e.target.files) setSelectedFile(e.target.files[0]) }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><div className="w-full p-3 bg-white/5 rounded-xl border-2 border-dashed border-white/20 text-white/60 font-bold text-center flex items-center justify-center gap-2"><UploadCloud size={20}/>{selectedFile ? selectedFile.name : "Tap to Select PDF"}</div></div></div>
              <div className="pt-2"><button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-500 transition">Add to Library</button></div>
            </form>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      {!isCallActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-lg border-t border-white/10 flex justify-around p-3 pb-6 z-20">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}><BookOpen size={24} /> Home</button>
          <button onClick={() => setActiveTab('library')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'library' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}><Library size={24} /> Library</button>
          <button onClick={() => setActiveTab('vote')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'vote' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}><Heart size={24} /> Vote</button>
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'chat' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}><MessageSquare size={24} /> Chat</button>
          <button onClick={() => setActiveTab('live')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'live' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}><Video size={24} /> Meet</button>
        </div>
      )}
    </div>
  );
};

export default App;