
import React, { useState, useEffect } from 'react';
import { ProcessedImage } from '../types';
import { downloadImage } from '../services/imageService';

interface AvatarCardProps {
  image: ProcessedImage;
  onRemove: (id: string) => void;
  onUpdateTransform: (id: string, scale: number, position: { x: number; y: number }) => void;
  onAiFill: (id: string) => void;
  onEnhance: (id: string) => void;
  onFileDrop: (id: string, file: File) => void;
}

const AvatarCard: React.FC<AvatarCardProps> = ({ image, onRemove, onUpdateTransform, onAiFill, onEnhance, onFileDrop }) => {
  const [localScale, setLocalScale] = useState(image.scale);
  const [localPos, setLocalPos] = useState(image.position);
  const [isHoveringFile, setIsHoveringFile] = useState(false);

  useEffect(() => {
    setLocalScale(image.scale);
    setLocalPos(image.position);
  }, [image.scale, image.position]);

  const handleDownload = () => {
    downloadImage(image.processedUrl, `avatar-${image.originalName.split('.')[0]}.png`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHoveringFile(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      onFileDrop(image.id, files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHoveringFile(true);
  };

  const handleDragLeave = () => setIsHoveringFile(false);

  const handleScaleChange = (val: number) => {
    setLocalScale(val);
    onUpdateTransform(image.id, val, localPos);
  };

  const handleXChange = (val: number) => {
    const newPos = { ...localPos, x: val };
    setLocalPos(newPos);
    onUpdateTransform(image.id, localScale, newPos);
  };

  const handleYChange = (val: number) => {
    const newPos = { ...localPos, y: val };
    setLocalPos(newPos);
    onUpdateTransform(image.id, localScale, newPos);
  };

  const isProcessing = image.status === 'processing' || image.status === 'filling';
  const needsFill = localScale < 1.0 || Math.abs(localPos.x) > 5 || Math.abs(localPos.y) > 5;

  return (
    <div className="group relative flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-2xl hover:border-indigo-300">
      {/* Circle Preview Wrapper */}
      <div 
        className={`aspect-square p-6 flex items-center justify-center relative bg-slate-50/80 overflow-hidden transition-all
          ${isHoveringFile ? 'bg-indigo-100 ring-4 ring-indigo-400 ring-inset' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isProcessing ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-white rounded-full shadow-inner animate-pulse border border-slate-100">
             <div className="relative">
                <i className="fas fa-circle-notch fa-spin text-indigo-500 text-4xl"></i>
                <i className="fas fa-sparkles absolute -top-2 -right-2 text-violet-500 text-sm animate-bounce"></i>
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-6 leading-tight">
                {image.status === 'filling' ? 'AI 处理中...' : '加载中...'}
             </span>
          </div>
        ) : (
          <div className="relative w-full h-full group/preview">
            <img 
              src={image.processedUrl} 
              alt="Processed Avatar" 
              className="w-full h-full rounded-full object-cover shadow-2xl bg-white border-8 border-white select-none pointer-events-none"
            />
            
            {/* AI Action Buttons */}
            <div className="absolute top-2 right-2 flex flex-col gap-2">
                <button 
                    onClick={() => onEnhance(image.id)}
                    title="AI 画质增强"
                    className="w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all active:scale-90 border border-slate-100"
                >
                    <i className="fas fa-wand-sparkles text-sm"></i>
                </button>
                <button 
                    onClick={() => onAiFill(image.id)}
                    title="AI 自动补全"
                    disabled={!needsFill}
                    className={`w-10 h-10 shadow-xl rounded-full flex items-center justify-center transition-all active:scale-90 border border-slate-100
                        ${needsFill ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                    `}
                >
                    <i className="fas fa-magic text-sm"></i>
                </button>
            </div>

            {isHoveringFile && (
              <div className="absolute inset-0 rounded-full bg-indigo-600/70 backdrop-blur-sm flex items-center justify-center">
                <i className="fas fa-file-arrow-down text-white text-4xl animate-bounce"></i>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Slider Controls */}
      <div className="px-6 py-5 bg-slate-50/40 border-t border-slate-100 space-y-4">
        {/* Zoom Slider */}
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>缩放比例</span>
                <span className="text-indigo-600">{Math.round(localScale * 100)}%</span>
            </div>
            <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.01"
                disabled={isProcessing}
                value={localScale}
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
            />
        </div>

        {/* X Position Slider */}
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>水平位置 (X)</span>
                <span className="text-indigo-600">{Math.round(localPos.x)}px</span>
            </div>
            <input 
                type="range" 
                min="-400" 
                max="400" 
                step="1"
                disabled={isProcessing}
                value={localPos.x}
                onChange={(e) => handleXChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
            />
        </div>

        {/* Y Position Slider */}
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>垂直位置 (Y)</span>
                <span className="text-indigo-600">{Math.round(localPos.y)}px</span>
            </div>
            <input 
                type="range" 
                min="-400" 
                max="400" 
                step="1"
                disabled={isProcessing}
                value={localPos.y}
                onChange={(e) => handleYChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
            />
        </div>
      </div>

      {/* Card Info & Main Actions */}
      <div className="px-6 pb-6 pt-2 flex flex-col flex-grow bg-white">
        <h3 className="text-[13px] font-black text-slate-900 truncate mb-1">
          {image.originalName}
        </h3>
        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-4 h-4 overflow-hidden opacity-60">
          {image.aiSuggestion || (isProcessing ? '正在处理...' : '素材已就绪')}
        </p>

        <div className="mt-auto flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={isProcessing}
            className="flex-1 py-3.5 px-4 bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-slate-100"
          >
            <i className="fas fa-download"></i>
            下载单图
          </button>
          <button
            onClick={() => onRemove(image.id)}
            className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
            title="移除"
          >
            <i className="fas fa-trash-can text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCard;
