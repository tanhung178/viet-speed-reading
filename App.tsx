
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  Settings as SettingsIcon, 
  Home as HomeIcon, 
  Zap, 
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Plus,
  Search,
  Clock,
  Award,
  FileText,
  Upload,
  Download,
  Loader2,
  Library as LibraryIcon,
  X,
  Trash2,
  Edit2,
  Save,
  AlertCircle,
  Database,
  RefreshCw,
  HelpCircle,
  FilePlus,
  Eraser
} from 'lucide-react';
import { AppView, TextMaterial, UserSession, QuizQuestion, AppSettings } from './types';
import { SAMPLE_TEXTS } from './constants';
import RSVPReader from './components/RSVPReader';
import Quiz from './components/Quiz';
import { geminiService } from './services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

const API_URL = "https://698d3e65b79d1c928ed4ca7b.mockapi.io/materials";

const DEFAULT_SETTINGS: AppSettings = {
  defaultWpm: 500,
  defaultFontSize: 15,
  defaultChunkSize: 55,
  isBionicEnabled: false,
  activeDrill: 'none'
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.Home);
  const [materials, setMaterials] = useState<TextMaterial[]>([]);
  const [selectedText, setSelectedText] = useState<TextMaterial | null>(null);
  const [customText, setCustomText] = useState("");
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Loading states
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // CRUD Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<TextMaterial> | null>(null);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: 'info'
  });

  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [lastWpm, setLastWpm] = useState(0);
  const [lastDuration, setLastDuration] = useState(0);
  
  const [isUploading, setIsUploading] = useState(false);
  const quickFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Tất cả");

  // Fetch Materials from API
  const fetchMaterials = async () => {
    setIsLoadingMaterials(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Không thể tải danh sách bài đọc");
      const data = await response.json();
      
      if (Array.isArray(data) && data.length === 0) {
        setMaterials(SAMPLE_TEXTS);
      } else {
        setMaterials(data);
      }
    } catch (error) {
      console.error("API Error:", error);
      setMaterials(SAMPLE_TEXTS);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
    try {
      const savedSessions = localStorage.getItem('viet-speed-sessions');
      if (savedSessions) setSessions(JSON.parse(savedSessions));

      const savedSettings = localStorage.getItem('viet-speed-settings');
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    } catch (e) { console.error(e); }
  }, []);

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    setIsSaving(true);
    try {
      if (editingMaterial.id && !editingMaterial.id.toString().startsWith('temp-')) {
        const response = await fetch(`${API_URL}/${editingMaterial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingMaterial)
        });
        if (!response.ok) throw new Error("Lỗi cập nhật");
      } else {
        const { id: _, ...materialData } = editingMaterial;
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(materialData)
        });
        if (!response.ok) throw new Error("Lỗi tạo mới");
      }
      await fetchMaterials();
      setIsEditModalOpen(false);
      setEditingMaterial(null);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xóa bài đọc",
      message: "Bạn có chắc chắn muốn xóa bài đọc này? Hành động này không thể hoàn tác.",
      type: 'danger',
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id: string) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setDeletingId(id);
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok || response.status === 404) {
        setMaterials(prev => prev.filter(m => m.id !== id));
      } else {
        throw new Error("Lỗi server");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateModal = (initialContent?: string) => {
    setEditingMaterial({
      title: "",
      category: "skills",
      difficulty: "medium",
      content: initialContent || "",
      length: "medium"
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (material: TextMaterial) => {
    setEditingMaterial({ ...material });
    setIsEditModalOpen(true);
  };

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('viet-speed-settings', JSON.stringify(newSettings));
  };

  const filteredTexts = useMemo(() => {
    return materials.filter(text => {
      const title = text.title || "";
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "Tất cả" || 
        (activeCategory === "Văn học" && text.category === 'literature') ||
        (activeCategory === "Khoa học" && text.category === 'science') ||
        (activeCategory === "Tin tức" && text.category === 'news') ||
        (activeCategory === "Kỹ năng" && text.category === 'skills');
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, activeCategory]);

  const startReading = (text: TextMaterial) => {
    setSelectedText(text);
    setView(AppView.Reader);
    setIsQuizMode(false);
  };

  const handleFinishReading = async (wpm: number, duration: number) => {
    setLastWpm(wpm);
    setLastDuration(duration);
    setIsQuizMode(true);
    setIsQuizLoading(true);
    if (selectedText) {
      const questions = await geminiService.generateQuiz(selectedText.content);
      setQuizQuestions(questions);
    }
    setIsQuizLoading(false);
  };

  const handleCompleteQuiz = (score: number) => {
    const newSession: UserSession = {
      date: new Date().toLocaleDateString('vi-VN'),
      wpm: lastWpm,
      comprehensionScore: score,
      durationSeconds: lastDuration,
      textId: selectedText?.id || 'custom'
    };
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    localStorage.setItem('viet-speed-sessions', JSON.stringify(updatedSessions));
    setView(AppView.Stats);
  };

  const processFile = async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
      }
      return fullText.trim();
    } else if (file.type === "text/plain") {
      return await file.text();
    } else {
      throw new Error("Chỉ hỗ trợ PDF/TXT");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: 'quick' | 'modal') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const text = await processFile(file);
      if (target === 'quick') {
        setCustomText(text);
      } else if (target === 'modal' && editingMaterial) {
        setEditingMaterial({ ...editingMaterial, content: text });
      }
    } catch (e: any) {
      alert(e.message || "Lỗi khi tải file");
    } finally {
      setIsUploading(false);
      event.target.value = ""; // Clear file input
    }
  };

  const statsSummary = useMemo(() => {
    if (sessions.length === 0) return { avgWpm: 0, avgScore: 0, totalMinutes: 0, bestWpm: 0 };
    return {
      avgWpm: Math.round(sessions.reduce((a, s) => a + s.wpm, 0) / sessions.length),
      avgScore: Math.round(sessions.reduce((a, s) => a + s.comprehensionScore, 0) / sessions.length),
      totalMinutes: Math.round(sessions.reduce((a, s) => a + s.durationSeconds, 0) / 60),
      bestWpm: Math.max(...sessions.map(s => s.wpm))
    };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-inter">
      {/* Top Navigator Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(AppView.Home)}>
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100"><Zap className="text-white" size={20} fill="white" /></div>
            <h1 className="text-xl font-black font-lexend tracking-tight text-slate-800">VietSpeed</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            <button onClick={() => setView(AppView.Home)} className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 ${view === AppView.Home ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}><HomeIcon size={16} /> Trang chủ</button>
            <button onClick={() => setView(AppView.Library)} className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 ${view === AppView.Library || view === AppView.Reader ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}><LibraryIcon size={16} /> Thư viện</button>
            <button onClick={() => setView(AppView.Stats)} className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 ${view === AppView.Stats ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}><BarChart3 size={16} /> Thống kê</button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition" title="Cài đặt"><SettingsIcon size={20} /></button>
          </nav>

          <div className="md:hidden flex items-center gap-2">
             <button onClick={() => setView(AppView.Library)} className="p-2 text-slate-500"><LibraryIcon size={20}/></button>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500"><SettingsIcon size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 pb-20">
        {view === AppView.Home && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-indigo-600 text-white rounded-3xl p-10 md:p-16 shadow-xl relative overflow-hidden">
               <div className="relative z-10">
                 <h2 className="text-4xl md:text-5xl font-black font-lexend mb-6 leading-tight">Đọc Nhanh Hơn,<br/>Hiểu Sâu Hơn.</h2>
                 <p className="text-indigo-100 max-w-lg text-lg mb-8">Nâng tầm khả năng xử lý thông tin với công nghệ RSVP hiện đại dành cho tiếng Việt.</p>
                 <div className="flex flex-wrap gap-4">
                   <button onClick={() => setView(AppView.Library)} className="px-8 py-4 bg-white text-indigo-700 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5">Bắt đầu ngay <ChevronRight size={20}/></button>
                   <button onClick={() => setView(AppView.Stats)} className="px-8 py-4 bg-indigo-500/30 backdrop-blur-sm text-white border border-indigo-400/30 rounded-xl font-bold hover:bg-indigo-500/40 transition">Xem tiến độ</button>
                 </div>
               </div>
               <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6"><Zap size={24} fill="currentColor"/></div>
                <h3 className="text-xl font-bold mb-3">Công nghệ RSVP</h3>
                <p className="text-slate-500 leading-relaxed">Hiển thị từ đơn lẻ tại một điểm cố định giúp giảm chuyển động mắt và tăng tốc độ đọc lên tới 3 lần.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6"><BrainCircuit size={24}/></div>
                <h3 className="text-xl font-bold mb-3">Kiểm tra thông minh</h3>
                <p className="text-slate-500 leading-relaxed">Sử dụng AI để tự động tạo câu hỏi trắc nghiệm dựa trên nội dung bài đọc, giúp đánh giá mức độ tiếp thu.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6"><TrendingUp size={24}/></div>
                <h3 className="text-xl font-bold mb-3">Theo dõi tiến độ</h3>
                <p className="text-slate-500 leading-relaxed">Biểu đồ trực quan giúp bạn theo dõi sự cải thiện của tốc độ đọc (WPM) và khả năng hiểu bài qua thời gian.</p>
              </div>
            </div>
          </div>
        )}

        {view === AppView.Library && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  Thư viện bài đọc
                  {isLoadingMaterials && <Loader2 size={20} className="animate-spin text-indigo-600" />}
                </h2>
                <p className="text-sm text-slate-500">Quản lý kho nội dung luyện tập</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm bài đọc..." 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition outline-none text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={fetchMaterials}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                  title="Làm mới danh sách"
                >
                  <RefreshCw size={20} className={isLoadingMaterials ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => openCreateModal()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
                >
                  <Plus size={16} /> Tạo bài mới
                </button>
              </div>
            </div>

            {/* Ô nhập liệu văn bản nhanh (Quick Upload Tool) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">Văn bản nhanh (không lưu)</h3>
                <div className="flex items-center gap-4">
                  {customText.trim() && (
                    <button 
                      onClick={() => setCustomText("")} 
                      className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1.5 transition uppercase tracking-wider"
                      title="Xóa toàn bộ nội dung"
                    >
                      <Eraser size={14}/> Xóa nội dung
                    </button>
                  )}
                  <button onClick={() => quickFileInputRef.current?.click()} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition uppercase tracking-wider"><Upload size={14}/> Tải PDF/TXT</button>
                  <input type="file" ref={quickFileInputRef} onChange={(e) => handleFileUpload(e, 'quick')} className="hidden" accept=".pdf,.txt" />
                  {isUploading && <Loader2 size={14} className="animate-spin text-indigo-600" />}
                </div>
              </div>
              <textarea 
                placeholder="Dán nội dung văn bản hoặc tải file tại đây để luyện tập nhanh mà không cần lưu vào thư viện..." 
                className="w-full h-32 p-4 bg-slate-50 rounded-xl outline-none border border-transparent focus:bg-white focus:border-indigo-100 transition resize-none text-sm leading-relaxed"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button 
                  disabled={!customText.trim() || isUploading}
                  onClick={() => openCreateModal(customText)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 disabled:opacity-30 transition flex items-center gap-2 active:scale-95"
                  title="Lưu nội dung này thành bài đọc trong thư viện"
                >
                  <FilePlus size={16} /> Lưu vào thư viện
                </button>
                <button 
                  disabled={!customText.trim() || isUploading}
                  onClick={() => startReading({
                    id: 'custom-' + Date.now(),
                    title: 'Văn bản tùy chỉnh',
                    category: 'custom',
                    content: customText,
                    difficulty: 'medium',
                    length: 'medium'
                  })}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm disabled:opacity-30 transition shadow-md shadow-indigo-100 active:scale-95 flex items-center gap-2"
                >
                  <Zap size={16} fill="white" /> Bắt đầu luyện tập
                </button>
              </div>
            </div>

            {/* Grid for Library Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
              {isLoadingMaterials ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 size={48} className="animate-spin mb-4" />
                  <p>Đang tải thư viện...</p>
                </div>
              ) : filteredTexts.length > 0 ? (
                filteredTexts.map(text => {
                  const wordCount = text.content?.split(/\s+/).filter(w => w.length > 0).length || 0;
                  const isDeleting = deletingId === text.id;
                  
                  return (
                    <div key={text.id} className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col group relative ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          text.category === 'literature' ? 'bg-pink-50 text-pink-600' :
                          text.category === 'science' ? 'bg-blue-50 text-blue-600' :
                          text.category === 'news' ? 'bg-orange-50 text-orange-600' :
                          'bg-purple-50 text-purple-600'
                        }`}>
                          {text.category === 'literature' ? 'Văn học' : text.category === 'science' ? 'Khoa học' : text.category === 'news' ? 'Tin tức' : 'Kỹ năng'}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center text-slate-400 gap-1 text-[10px] font-bold">
                            <FileText size={10} /> {wordCount} từ
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          disabled={isSaving || !!deletingId} 
                          onClick={(e) => { e.stopPropagation(); openEditModal(text); }} 
                          className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-600 hover:text-white transition shadow-sm disabled:opacity-50"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          disabled={isSaving || !!deletingId} 
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(text.id); }} 
                          className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[36px] min-h-[36px]"
                        >
                          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors pr-12">{text.title}</h3>
                      <p className="text-slate-500 text-xs line-clamp-3 mb-6 leading-relaxed flex-1">{text.content}</p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                          <BarChart3 size={12} /> 
                          <span className={text.difficulty === 'hard' ? 'text-red-400' : text.difficulty === 'medium' ? 'text-amber-400' : 'text-emerald-400'}>{text.difficulty === 'easy' ? 'Dễ' : text.difficulty === 'medium' ? 'Vừa' : 'Khó'}</span>
                        </div>
                        <button onClick={() => startReading(text)} className="flex items-center gap-1 text-indigo-600 font-bold text-xs hover:translate-x-1 transition-transform">Chọn bài <ChevronRight size={14} /></button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-20 text-slate-400 italic">Không tìm thấy bài đọc nào.</div>
              )}
            </div>
          </div>
        )}

        {view === AppView.Reader && selectedText && (
          <div className="animate-in fade-in duration-500">
            {isQuizMode ? (
              <Quiz questions={quizQuestions} isLoading={isQuizLoading} onComplete={handleCompleteQuiz} />
            ) : (
              <RSVPReader 
                content={selectedText.content} 
                title={selectedText.category !== 'custom' ? selectedText.title : undefined}
                settings={settings} 
                availableTexts={materials} 
                onSelectArticle={startReading} 
                onFinish={handleFinishReading} 
                onBackToLibrary={() => setView(AppView.Library)} 
              />
            )}
          </div>
        )}

        {view === AppView.Stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800">Tiến trình của bạn</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3"><Zap size={20} fill="currentColor"/></div>
                <div className="text-2xl font-black text-slate-800">{statsSummary.avgWpm}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">WPM Trung bình</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3"><BrainCircuit size={20}/></div>
                <div className="text-2xl font-black text-slate-800">{statsSummary.avgScore}%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tỷ lệ hiểu bài</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3"><Clock size={20}/></div>
                <div className="text-2xl font-black text-slate-800">{statsSummary.totalMinutes}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Phút luyện tập</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-100"><Award size={20}/></div>
                <div className="text-2xl font-black text-slate-800">{statsSummary.bestWpm}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">WPM Cao nhất</div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-slate-700">Lịch sử tốc độ đọc (WPM)</h3>
                <div className="h-60 w-full">
                  {sessions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sessions}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" hide />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="wpm" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Chưa có dữ liệu luyện tập.</div>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-lg font-bold mb-4 text-slate-700">Phiên gần đây</h3>
                <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1">
                  {sessions.length > 0 ? [...sessions].reverse().slice(0, 5).map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200"><Zap size={14} className="text-indigo-600" /></div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{s.wpm} WPM</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{s.date}</div>
                        </div>
                      </div>
                      <div className={`text-xs font-black ${s.comprehensionScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{s.comprehensionScore}%</div>
                    </div>
                  )) : (
                    <p className="text-slate-400 text-xs text-center py-8 italic">Lịch sử đang trống.</p>
                  )}
                </div>
                <button 
                   onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: "Xóa lịch sử",
                        message: "Bạn có chắc chắn muốn xóa toàn bộ lịch sử luyện tập?",
                        type: 'danger',
                        onConfirm: () => {
                           setSessions([]); 
                           localStorage.removeItem('viet-speed-sessions');
                           setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        }
                      });
                   }} 
                   className="mt-4 pt-4 border-t border-slate-50 text-slate-400 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={12} /> Xóa lịch sử
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CRUD Modal for Materials */}
      {isEditModalOpen && editingMaterial && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><FileText size={20}/></div>
                <h3 className="text-xl font-black text-slate-800">{editingMaterial.id ? "Sửa bài đọc" : "Tạo bài đọc mới"}</h3>
              </div>
              <button disabled={isSaving} onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveMaterial} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiêu đề bài đọc</label>
                <input required disabled={isSaving} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition disabled:opacity-50" placeholder="Ví dụ: Tương lai của công nghệ sạch" value={editingMaterial.title} onChange={(e) => setEditingMaterial({...editingMaterial, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thể loại</label>
                  <select disabled={isSaving} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none disabled:opacity-50" value={editingMaterial.category} onChange={(e) => setEditingMaterial({...editingMaterial, category: e.target.value as any})}>
                    <option value="literature">Văn học</option><option value="science">Khoa học</option><option value="news">Tin tức</option><option value="skills">Kỹ năng</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Độ khó</label>
                  <select disabled={isSaving} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none disabled:opacity-50" value={editingMaterial.difficulty} onChange={(e) => setEditingMaterial({...editingMaterial, difficulty: e.target.value as any})}>
                    <option value="easy">Dễ (Dành cho người mới)</option><option value="medium">Trung bình (Dành cho luyện tập)</option><option value="hard">Khó (Nâng cao khả năng hiểu)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung bài đọc</label>
                  <div className="flex items-center gap-3">
                     <button type="button" onClick={() => modalFileInputRef.current?.click()} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 uppercase tracking-widest transition">
                        <Upload size={12} /> Tải PDF/TXT
                     </button>
                     <input type="file" ref={modalFileInputRef} onChange={(e) => handleFileUpload(e, 'modal')} className="hidden" accept=".pdf,.txt" />
                     {isUploading && <Loader2 size={12} className="animate-spin text-indigo-600" />}
                  </div>
                </div>
                <textarea required disabled={isSaving} placeholder="Nhập nội dung bài đọc tại đây hoặc tải file lên..." className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition resize-none leading-relaxed disabled:opacity-50" value={editingMaterial.content} onChange={(e) => setEditingMaterial({...editingMaterial, content: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" disabled={isSaving} onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition active:scale-[0.98] disabled:opacity-50">Hủy bỏ</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Lưu bài đọc</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                confirmModal.type === 'danger' ? 'bg-red-50 text-red-500' : 
                confirmModal.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'
              }`}>
                {confirmModal.type === 'danger' ? <Trash2 size={32} /> : 
                 confirmModal.type === 'warning' ? <AlertCircle size={32} /> : <HelpCircle size={32} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                 <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition active:scale-[0.95]"
                 >
                   Hủy
                 </button>
                 <button 
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition active:scale-[0.95] ${
                    confirmModal.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-100' : 
                    confirmModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                  }`}
                 >
                   Xác nhận
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-black text-slate-800">Cài đặt mặc định</h3><button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition"><X size={18}/></button></div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tốc độ mặc định</label><span className="text-xs font-black text-indigo-600">{settings.defaultWpm} WPM</span></div>
                <input type="range" min="100" max="1500" step="50" value={settings.defaultWpm} onChange={(e) => saveSettings({...settings, defaultWpm: Number(e.target.value)})} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cỡ chữ mặc định</label><span className="text-xs font-black text-indigo-600">{settings.defaultFontSize}px</span></div>
                <input type="range" min="16" max="48" step="1" value={settings.defaultFontSize} onChange={(e) => saveSettings({...settings, defaultFontSize: Number(e.target.value)})} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div><div className="text-xs font-bold text-slate-800">Bionic Mode</div><div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Cố định tiêu điểm mắt</div></div>
                <button onClick={() => saveSettings({...settings, isBionicEnabled: !settings.isBionicEnabled})} className={`w-10 h-5 rounded-full transition-colors relative ${settings.isBionicEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.isBionicEnabled ? 'left-5.5' : 'left-0.5'}`} /></button>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md transition active:scale-[0.98]">Lưu và Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
