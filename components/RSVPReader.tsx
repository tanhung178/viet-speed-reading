
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings as SettingsIcon, 
  CheckCircle, 
  Clock, 
  Type as TypeIcon, 
  Maximize2, 
  Zap, 
  Eye, 
  Move, 
  Ghost,
  Bold,
  Library as LibraryIcon,
  ChevronLeft,
  ChevronRight,
  Timer,
  FileText,
  X,
  Search,
  Activity
} from 'lucide-react';
import { ReadingDrill, AppSettings, TextMaterial } from '../types';

interface RSVPReaderProps {
  content: string;
  title?: string;
  settings: AppSettings;
  availableTexts: TextMaterial[];
  onSelectArticle: (text: TextMaterial) => void;
  onFinish: (wpm: number, durationSeconds: number) => void;
  onBackToLibrary: () => void;
}

const RSVPReader: React.FC<RSVPReaderProps> = ({ 
  content, 
  title,
  settings, 
  availableTexts,
  onSelectArticle,
  onFinish, 
  onBackToLibrary 
}) => {
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(settings?.defaultWpm || 500);
  const [chunkSize, setChunkSize] = useState(settings?.defaultChunkSize || 55);
  const [fontSize, setFontSize] = useState(settings?.defaultFontSize || 15);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [liveSeconds, setLiveSeconds] = useState(0);

  const [isBionicEnabled, setIsBionicEnabled] = useState(settings?.isBionicEnabled || false);
  const [activeDrill, setActiveDrill] = useState<ReadingDrill>(settings?.activeDrill || 'none');
  const [peripheralWidth] = useState(40);

  // Quick Library state
  const [showQuickLibrary, setShowQuickLibrary] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveClockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (settings) {
      setWpm(settings.defaultWpm);
      setChunkSize(settings.defaultChunkSize);
      setFontSize(settings.defaultFontSize);
      setIsBionicEnabled(settings.isBionicEnabled);
      setActiveDrill(settings.activeDrill);
    }
  }, [settings]);

  useEffect(() => {
    if (content) {
      const tokens = content.split(/\s+/).filter(t => t.length > 0);
      setWords(tokens);
      setCurrentIndex(0);
      setIsFinished(false);
      setIsPlaying(false);
      setTotalElapsed(0);
      setLiveSeconds(0);
      setStartTime(null);
      setShowQuickLibrary(false);
    }
  }, [content]);

  useEffect(() => {
    if (isPlaying && !isFinished) {
      liveClockRef.current = setInterval(() => {
        setLiveSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (liveClockRef.current) clearInterval(liveClockRef.current);
    }
    return () => { if (liveClockRef.current) clearInterval(liveClockRef.current); };
  }, [isPlaying, isFinished]);

  const handleFinish = useCallback(() => {
    setIsPlaying(false);
    setIsFinished(true);
    const duration = startTime ? (Date.now() - startTime) / 1000 : liveSeconds;
    setTotalElapsed(duration);
  }, [startTime, liveSeconds]);

  const goToNextChunk = useCallback(() => {
    setCurrentIndex(prev => {
      const next = prev + chunkSize;
      if (next >= words.length) {
        handleFinish();
        return words.length;
      }
      return next;
    });
  }, [chunkSize, words.length, handleFinish]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying && currentIndex === 0) {
      setStartTime(Date.now());
      setLiveSeconds(0);
    }
    setIsPlaying(prev => !prev);
  }, [isPlaying, currentIndex]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setIsFinished(false);
    setTotalElapsed(0);
    setLiveSeconds(0);
    setStartTime(null);
    setShowQuickLibrary(false);
  }, []);

  const handleManualNext = useCallback(() => {
    if (isFinished) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    goToNextChunk();
  }, [isFinished, goToNextChunk]);

  useEffect(() => {
    if (isPlaying && currentIndex < words.length) {
      const interval = (60 * 1000) / (Math.max(wpm, 10) / Math.max(chunkSize, 1));
      timerRef.current = setTimeout(goToNextChunk, interval);
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, currentIndex, words.length, wpm, chunkSize, goToNextChunk]);

  const formatBionic = (text: string) => {
    if (!isBionicEnabled) return text;
    return text.split(' ').map((word, i) => {
      if (word.length <= 3) return <strong key={i} className="font-black">{word} </strong>;
      const mid = Math.ceil(word.length / 2);
      return (
        <span key={i} className="mr-1 inline-block">
          <strong className="font-black">{word.slice(0, mid)}</strong>
          <span>{word.slice(mid)}</span>
        </span>
      );
    });
  };

  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;
  const currentChunk = useMemo(() => words.slice(currentIndex, currentIndex + chunkSize).join(' '), [words, currentIndex, chunkSize]);
  const wordsReadSoFar = Math.min(currentIndex + chunkSize, words.length);

  // Tính toán tốc độ WPM thực tế
  const actualWpm = useMemo(() => {
    const durationMinutes = totalElapsed / 60;
    if (durationMinutes <= 0) return 0;
    return Math.round(words.length / durationMinutes);
  }, [words.length, totalElapsed]);

  const filteredQuickTexts = useMemo(() => {
    return availableTexts.filter(t => t.title.toLowerCase().includes(quickSearch.toLowerCase()));
  }, [availableTexts, quickSearch]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto space-y-4">
      <div className="relative w-full min-h-[380px] md:min-h-[450px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 overflow-hidden z-20">
          <div className="bg-indigo-600 h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Header Area with Back Button, Title and Info Chips */}
        {!isFinished && !showQuickLibrary && (
          <div className="absolute top-6 left-0 right-0 px-8 z-30 flex justify-between items-center gap-4">
            {/* Back Button */}
            <button 
              onClick={onBackToLibrary}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-600 hover:text-indigo-600 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 group"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">Thư viện</span>
            </button>

            {/* Title Display */}
            {title && (
              <div className="flex-1 text-center truncate">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest opacity-80 line-clamp-1">{title}</span>
              </div>
            )}

            {/* Stats Chips */}
            <div className="flex-shrink-0 flex gap-2">
              <div className="bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
                <Timer size={14} className="text-indigo-400 animate-pulse" />
                <span className="text-xs font-black text-white font-mono tracking-wider">{liveSeconds}s</span>
              </div>
              <div className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-slate-200 shadow-md">
                <FileText size={14} className="text-emerald-500" />
                <span className="text-xs font-black text-slate-700 font-mono tracking-wider">
                  {wordsReadSoFar} <span className="text-[10px] text-slate-400 opacity-50">/ {words.length}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative flex items-center justify-center bg-slate-50/20 p-8 md:p-12 overflow-hidden">
          {showQuickLibrary ? (
            <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">Chọn bài tiếp theo</h3>
                <button onClick={() => setShowQuickLibrary(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
              </div>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Tìm nhanh..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[300px] pr-2 no-scrollbar">
                {filteredQuickTexts.map(text => (
                  <button 
                    key={text.id} 
                    onClick={() => onSelectArticle(text)}
                    className="flex flex-col p-4 bg-white border border-slate-100 rounded-2xl text-left hover:border-indigo-400 hover:shadow-md transition active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                         {text.category === 'literature' ? 'Văn học' : text.category === 'science' ? 'Khoa học' : 'Kỹ năng'}
                       </span>
                    </div>
                    <span className="text-sm font-bold text-slate-800 line-clamp-1">{text.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : !isFinished ? (
            <div 
              className={`font-medium text-slate-800 font-lexend text-left leading-tight transition-all duration-75 select-none ${isPlaying ? 'opacity-100' : 'opacity-40'}`}
              style={{ 
                fontSize: `${fontSize}px`, 
                maxWidth: activeDrill === 'peripheral' ? `${peripheralWidth}%` : '90%',
                filter: activeDrill === 'anti-regression' && !isPlaying ? 'blur(8px)' : 'none'
              }}
            >
              {isBionicEnabled ? formatBionic(currentChunk) : (currentChunk || "Bấm Bắt Đầu...")}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 text-emerald-600 animate-in zoom-in duration-300 p-4">
              <div className="bg-emerald-100 p-6 rounded-full shadow-lg shadow-emerald-50"><CheckCircle size={56} /></div>
              <div className="text-center">
                <h3 className="text-2xl font-black block tracking-tight">Hoàn thành bài đọc!</h3>
                <div className="flex flex-col items-center mt-3 gap-2">
                  <div className="text-slate-500 flex items-center justify-center font-bold text-[10px] uppercase tracking-tight">
                    <Clock size={12} className="mr-2 text-slate-400" /> THỜI GIAN: {Math.round(totalElapsed)} GIÂY
                  </div>
                  <div className="text-slate-500 flex items-center justify-center font-bold text-[10px] uppercase tracking-tight">
                    <FileText size={12} className="mr-2 text-slate-400" /> TỔNG SỐ TỪ: {words.length} TỪ
                  </div>
                  <div className="mt-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-black text-[11px] uppercase tracking-widest border border-indigo-100">
                    <Activity size={13} className="mr-2 text-indigo-500" /> TỐC ĐỘ THỰC TẾ: {actualWpm} WPM
                  </div>
                </div>
              </div>
              <div className="flex flex-col w-full max-w-sm gap-3 mt-4">
                <button onClick={() => onFinish(actualWpm, totalElapsed)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2">
                   KIỂM TRA HIỂU BÀI <ChevronRight size={20} />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleReset} className="flex items-center justify-center py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold active:scale-95"><RotateCcw size={18} className="mr-2" /> Đọc lại</button>
                  <button onClick={() => setShowQuickLibrary(true)} className="flex items-center justify-center py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold active:scale-95"><LibraryIcon size={18} className="mr-2" /> Bài khác</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isFinished && !showQuickLibrary && (
          <div className="absolute bottom-8 right-8 flex items-center gap-3 z-30">
             <button onClick={handleManualNext} className="p-4 bg-white/90 backdrop-blur shadow-lg border border-slate-200 rounded-2xl text-indigo-600 active:scale-90"><ChevronRight size={24} /></button>
             <button onClick={handlePlayPause} className={`p-4 backdrop-blur shadow-lg border border-slate-200 rounded-2xl transition-all transform active:scale-95 ${isPlaying ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'}`}>
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
             </button>
             <button onClick={handleReset} className="p-4 bg-white/90 backdrop-blur shadow-lg border border-slate-200 rounded-2xl text-slate-500 active:scale-95"><RotateCcw size={24} /></button>
          </div>
        )}
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-100 flex flex-col space-y-6">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase flex items-center"><SettingsIcon size={12} className="mr-2" /> Tốc độ</label>
              <span className="text-sm font-black text-indigo-600">{wpm} WPM</span>
            </div>
            <input type="range" min="100" max="1500" step="50" value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase flex items-center"><TypeIcon size={12} className="mr-2" /> Cỡ chữ</label>
              <span className="text-sm font-black text-indigo-600">{fontSize}px</span>
            </div>
            <input type="range" min="10" max="50" step="1" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-100 flex flex-col justify-between">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center"><Maximize2 size={12} className="mr-2" /> Khối hiển thị</label>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 5, 8, 13, 21, 34, 55, 89].map(size => (
              <button key={size} onClick={() => setChunkSize(size)} className={`py-1.5 text-[9px] font-black rounded-lg border ${chunkSize === size ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>{size}</button>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-100 flex flex-col">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center"><Zap size={12} className="mr-2" /> Kỹ thuật</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActiveDrill(activeDrill === 'peripheral' ? 'none' : 'peripheral')} className={`p-2 flex flex-col items-center gap-1 rounded-xl border text-[9px] font-bold ${activeDrill === 'peripheral' ? 'bg-indigo-50 border-indigo-400' : 'bg-slate-50 border-slate-100'}`}><Eye size={14} /> Tầm nhìn</button>
            <button onClick={() => setActiveDrill(activeDrill === 'z-pattern' ? 'none' : 'z-pattern')} className={`p-2 flex flex-col items-center gap-1 rounded-xl border text-[9px] font-bold ${activeDrill === 'z-pattern' ? 'bg-indigo-50 border-indigo-400' : 'bg-slate-50 border-slate-100'}`}><Move size={14} /> Z-Pattern</button>
            <button onClick={() => setActiveDrill(activeDrill === 'anti-regression' ? 'none' : 'anti-regression')} className={`p-2 flex flex-col items-center gap-1 rounded-xl border text-[9px] font-bold ${activeDrill === 'anti-regression' ? 'bg-indigo-50 border-indigo-400' : 'bg-slate-50 border-slate-100'}`}><Ghost size={14} /> Tập trung</button>
            <button onClick={() => setIsBionicEnabled(!isBionicEnabled)} className={`p-2 flex flex-col items-center gap-1 rounded-xl border text-[9px] font-bold ${isBionicEnabled ? 'bg-indigo-50 border-indigo-400' : 'bg-slate-50 border-slate-100'}`}><Bold size={14} /> Bionic</button>
          </div>
        </div>

        <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg text-white flex flex-col justify-center">
           <h4 className="text-[10px] font-black uppercase mb-2 opacity-80 flex items-center"><Zap size={12} className="mr-2 text-yellow-400" /> Mẹo hay</h4>
           <div className="text-[9px] font-medium leading-relaxed italic">
             {activeDrill === 'peripheral' && "Giới hạn tầm nhìn bắt não bộ phải xử lý hình ảnh ngoại vi thay vì nhìn từng chữ."}
             {activeDrill === 'none' && "Phối hợp các kỹ thuật này để phá bỏ giới hạn đọc hiểu của não bộ."}
             {isBionicEnabled && "Cố định điểm nhìn vào phần in đậm. Não sẽ tự hoàn thành phần còn lại của từ."}
           </div>
        </div>
      </div>
    </div>
  );
};

export default RSVPReader;
