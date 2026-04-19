import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Eraser, Check } from 'lucide-react';

interface Props {
  title: string;
  initialData?: string;
  onSave: (data: string) => void;
  onClose: () => void;
}

export default function SignaturePad({ title, initialData, onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1e40af";
      
      if (initialData && initialData.length > 1500) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width/2, canvas.height/2);
        img.src = initialData;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [initialData]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const end = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col">
      <div className="bg-[#003087] text-white p-4 flex items-center justify-center relative shrink-0 shadow-md">
        <button onClick={onClose} className="absolute left-4 top-0 bottom-0 px-2 text-2xl">
          <ArrowLeft />
        </button>
        <h2 className="font-bold text-lg tracking-wider">{title}</h2>
      </div>
      <div className="flex-1 bg-gray-100 p-4 flex flex-col items-center justify-center relative">
        <div className="w-full h-full max-h-[400px] bg-white border-2 border-dashed border-gray-400 rounded-3xl relative shadow-inner overflow-hidden">
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full touch-none"
            onMouseDown={start}
            onMouseMove={draw}
            onMouseUp={end}
            onMouseOut={end}
            onTouchStart={start}
            onTouchMove={draw}
            onTouchEnd={end}
          />
          <div className="absolute bottom-4 left-0 right-0 text-center text-gray-300 pointer-events-none text-xs uppercase font-bold tracking-widest">
            Dibuja tu firma aquí
          </div>
        </div>
      </div>
      <div className="p-4 bg-white grid grid-cols-2 gap-4 shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t-2 border-gray-200 pb-8 sm:pb-4">
        <button onClick={clear} className="bg-red-500 hover:bg-red-400 text-white py-4 rounded-2xl font-extrabold text-sm shadow-[0_4px_0_0_#991b1b] border-b-4 border-red-800 transition-all active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2">
          <Eraser className="w-5 h-5 drop-shadow-sm" /> BORRAR FIRMA
        </button>
        <button onClick={save} className="bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-extrabold text-sm shadow-[0_4px_0_0_#065f46] border-b-4 border-emerald-800 transition-all active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2">
          <Check className="w-5 h-5 drop-shadow-sm" /> GUARDAR FIRMA
        </button>
      </div>
    </div>
  );
}
