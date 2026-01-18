
import React, { useState, useRef, useCallback } from 'react';
import { ProcessedImage } from './types';
import { processImageToCircle, downloadImage, generateA4Sheet } from './services/imageService';
import { suggestAvatarPersona, outpaintAvatar, enhanceImageQuality } from './services/geminiService';
import AvatarCard from './components/AvatarCard';

const MAX_IMAGES = 6;

const App: React.FC = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isHoveringGlobal, setIsHoveringGlobal] = useState(false);
  const [a4Preview, setA4Preview] = useState<string | null>(null);
  const [isGeneratingA4, setIsGeneratingA4] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processSingleFile = async (file: File, existingId?: string) => {
    const id = existingId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const initialEntry: ProcessedImage = {
      id,
      originalName: file.name,
      processedUrl: '',
      originalFile: file,
      scale: 1.0,
      position: { x: 0, y: 0 },
      status: 'processing'
    };

    if (existingId) {
      setImages(prev => prev.map(img => img.id === existingId ? initialEntry : img));
    } else {
      setImages(prev => [...prev, initialEntry]);
    }

    try {
      const processedUrl = await processImageToCircle(file, 1.0, { x: 0, y: 0 });
      const aiSuggestion = await suggestAvatarPersona(processedUrl);

      setImages(prev => prev.map(img => 
        img.id === id 
          ? { ...img, processedUrl, aiSuggestion, status: 'ready' as const } 
          : img
      ));
    } catch (err) {
      console.error("Processing error:", err);
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, status: 'error' as const } : img
      ));
    }
  };

  const handleProcessFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const remainingSlots = MAX_IMAGES - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    filesToProcess.forEach(file => processSingleFile(file));
  }, [images.length]);

  const updateTransform = async (id: string, newScale: number, newPosition: { x: number; y: number }) => {
    setImages(prev => prev.map(img => {
      if (img.id === id) {
        return { ...img, scale: newScale, position: newPosition };
      }
      return img;
    }));

    const target = images.find(img => img.id === id);
    if (target) {
      const newUrl = await processImageToCircle(target.originalFile, newScale, newPosition);
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, processedUrl: newUrl } : img
      ));
    }
  };

  const handleAiFill = async (id: string) => {
    const target = images.find(img => img.id === id);
    if (!target) return;

    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, status: 'filling' as const } : img
    ));

    try {
      const filledUrl = await outpaintAvatar(target.processedUrl);
      const finalizedUrl = await processImageToCircle(filledUrl, 1.0, { x: 0, y: 0 });

      setImages(prev => prev.map(img => 
        img.id === id ? { 
          ...img, 
          processedUrl: finalizedUrl, 
          status: 'ready' as const,
          scale: 1.0,
          position: { x: 0, y: 0 }
        } : img
      ));
    } catch (err) {
      console.error("AI Fill error:", err);
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, status: 'ready' as const } : img
      ));
      alert("AI 边缘补全失败。");
    }
  };

  const handleEnhance = async (id: string) => {
    const target = images.find(img => img.id === id);
    if (!target) return;

    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, status: 'filling' as const } : img
    ));

    try {
      const enhancedUrl = await enhanceImageQuality(target.processedUrl);
      const finalizedUrl = await processImageToCircle(enhancedUrl, 1.0, { x: 0, y: 0 });

      setImages(prev => prev.map(img => 
        img.id === id ? { 
          ...img, 
          processedUrl: finalizedUrl, 
          status: 'ready' as const,
          scale: 1.0,
          position: { x: 0, y: 0 }
        } : img
      ));
    } catch (err) {
      console.error("Enhance error:", err);
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, status: 'ready' as const } : img
      ));
      alert("画质增强失败。");
    }
  };

  const generateA4 = async () => {
    if (images.length === 0) return;
    setIsGeneratingA4(true);
    const urls = images.filter(img => img.status === 'ready').map(img => img.processedUrl);
    const result = await generateA4Sheet(urls);
    setA4Preview(result);
    setIsGeneratingA4(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleProcessFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSlotDrop = (id: string, file: File) => {
    processSingleFile(file, id);
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoveringGlobal(false);
    handleProcessFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdff] text-slate-900 overflow-x-hidden relative">
      {/* Cartoon Texture Background Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-0" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/doodles.png")' }}></div>
      
      {/* Decorative Background Shapes */}
      <div className="fixed -top-32 -right-32 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="fixed -bottom-32 -left-32 w-[30rem] h-[30rem] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <header className="bg-white/80 backdrop-blur-3xl border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-100 rotate-2">
              <i className="fas fa-wand-magic-sparkles text-white text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter leading-none text-slate-900">吧唧魔法机 <span className="text-indigo-600">Pro</span></h1>
              <p className="text-[9px] uppercase tracking-[0.4em] text-slate-400 font-black mt-1">6-Slot 2-Column Professional Layout</p>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
             {images.length > 0 && (
                <button 
                  onClick={generateA4}
                  disabled={isGeneratingA4}
                  className="group flex items-center gap-3 text-sm font-black text-white bg-slate-900 hover:bg-black px-8 py-3.5 rounded-2xl transition-all shadow-2xl shadow-slate-200 active:scale-95 disabled:bg-slate-200 disabled:shadow-none"
                >
                  <i className={isGeneratingA4 ? "fas fa-circle-notch fa-spin" : "fas fa-print group-hover:rotate-12 transition-transform"}></i>
                  生成 A4 排版 (一页6图)
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-16 relative z-10">
        <div className="flex flex-col gap-20">
          
          <section className="text-center space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] max-w-5xl mx-auto text-slate-900">
              精确缩放，<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] animate-gradient-slow">6图 2x3 拼版魔法</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-xl font-bold leading-relaxed">
              支持一页 <span className="text-indigo-600 font-black">6 张</span> 800px 吧唧圆型排版。采用 <span className="text-slate-900 font-black">一行2个</span> 的间距优化布局。
            </p>

            <div className="pt-10">
              {images.length < MAX_IMAGES ? (
                <div 
                  className={`relative max-w-4xl mx-auto border-4 border-dashed rounded-[4rem] p-20 transition-all duration-500 cursor-pointer group
                    ${isHoveringGlobal ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01] shadow-2xl shadow-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50 shadow-2xl shadow-slate-100/30'}
                  `}
                  onDragOver={(e) => { e.preventDefault(); setIsHoveringGlobal(true); }}
                  onDragLeave={() => setIsHoveringGlobal(false)}
                  onDrop={handleGlobalDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} onChange={onFileChange} multiple accept="image/*" className="hidden" />
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-3xl shadow-indigo-200 group-hover:scale-110 transition-all duration-500">
                      <i className="fas fa-file-export text-white text-4xl"></i>
                    </div>
                    <p className="text-3xl font-black text-slate-900 mb-2">批量上传吧唧素材 ({images.length}/{MAX_IMAGES})</p>
                    <p className="text-slate-400 font-bold text-lg italic">每行2个，每页6个吧唧 • 自动裁剪为 800x800 圆型</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto p-12 bg-slate-900 text-white rounded-[4rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                   <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border-4 border-emerald-500/40">
                     <i className="fas fa-check text-emerald-400 text-3xl"></i>
                   </div>
                   <p className="font-black text-3xl">槽位已满 (6图模式)</p>
                   <p className="text-slate-400 font-medium italic text-center">已适配 A4 一行2个间距布局，请生成排版预览</p>
                </div>
              )}
            </div>
          </section>

          <section id="studio-canvas">
            <div className="flex items-center justify-between mb-12">
               <div className="flex flex-col">
                 <h3 className="text-4xl font-black tracking-tighter text-slate-900">吧唧实验室</h3>
                 <span className="text-indigo-500 font-black text-xs uppercase tracking-[0.3em] mt-1">Professional 2x3 Grid</span>
               </div>
               {images.length > 0 && (
                 <button onClick={() => setImages([])} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-xl">
                   <i className="fas fa-trash-can"></i>
                   清空列表
                 </button>
               )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {images.map(image => (
                <AvatarCard 
                  key={image.id} 
                  image={image} 
                  onRemove={removeImage}
                  onUpdateTransform={updateTransform}
                  onAiFill={handleAiFill}
                  onEnhance={handleEnhance}
                  onFileDrop={handleSlotDrop}
                />
              ))}
              {[...Array(Math.max(0, MAX_IMAGES - images.length))].map((_, i) => (
                <div 
                  key={`empty-${i}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-50/20'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/20'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/20');
                    handleProcessFiles(e.dataTransfer.files);
                  }}
                  className="aspect-[4/5] border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-200 hover:text-indigo-400 hover:border-indigo-200 hover:bg-white transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-50 transition-all duration-500">
                    <i className="fas fa-plus text-xl text-slate-200 group-hover:text-indigo-400"></i>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">待填充槽位</span>
                </div>
              ))}
            </div>
          </section>

          {a4Preview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-2xl" onClick={() => setA4Preview(null)}></div>
              <div className="relative bg-white rounded-[4rem] p-12 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-12">
                   <div>
                     <h3 className="text-4xl font-black tracking-tight text-slate-900">A4 吧唧拼版预览 (800px)</h3>
                     <p className="text-slate-400 font-bold mt-1 text-lg">一行2个 • 每页6个 • 标准打印间距</p>
                   </div>
                   <button onClick={() => setA4Preview(null)} className="w-16 h-16 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all group active:scale-90">
                     <i className="fas fa-times text-2xl text-slate-400 group-hover:text-slate-900"></i>
                   </button>
                </div>
                
                <div className="flex-grow overflow-auto bg-slate-100 rounded-[3rem] p-12 flex items-center justify-center custom-scrollbar">
                   <img src={a4Preview} alt="A4 Preview" className="max-h-[60vh] object-contain shadow-2xl bg-white" />
                </div>

                <div className="mt-12 flex gap-8">
                   <button 
                    onClick={() => downloadImage(a4Preview, '吧唧拼版-2x3专业排版.jpg')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl py-6 rounded-[2.5rem] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-indigo-200 active:scale-95"
                   >
                     <i className="fas fa-file-download text-2xl"></i>
                     保存排版图 (JPEG)
                   </button>
                   <button onClick={() => setA4Preview(null)} className="px-12 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-6 rounded-[2.5rem] transition-all">
                     返回编辑
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-24 text-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-8">
          <p className="text-slate-400 font-black text-xs tracking-widest uppercase italic">
            吧唧排版魔法师 Pro • 800px 专业精度
          </p>
        </div>
      </footer>
      
      <style>{`
        @keyframes gradient-slow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-slow {
          animation: gradient-slow 8s ease infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default App;
