"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Square, Eraser, RotateCcw, Save, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { useConfigStore } from '../../lib/configStore';

interface BoardElement {
  type: 'pen' | 'rect';
  color: string;
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface CollaborativeBoardBlockProps {
  blockId?: string;
}

export default function CollaborativeBoardBlock({ blockId = 'demo-board-1' }: CollaborativeBoardBlockProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [tool, setTool] = useState<'pen' | 'rect' | 'eraser'>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const { config } = useConfigStore();

  // Load board state on mount
  useEffect(() => {
    async function loadBoard() {
      try {
        const res = await fetchApi(`/boards/${blockId}`);
        if (res.success && res.data?.elementsJson) {
          const parsed = JSON.parse(res.data.elementsJson);
          if (Array.isArray(parsed)) setElements(parsed);
        }
      } catch (err) {
        console.warn('Could not load board state:', err);
      }
    }
    loadBoard();
  }, [blockId]);

  // Redraw canvas whenever elements change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    elements.forEach((el) => {
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.type === 'pen' ? 3 : 2;

      if (el.type === 'pen' && el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        el.points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      } else if (el.type === 'rect' && el.x !== undefined && el.y !== undefined) {
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.width || 0, el.height || 0);
        ctx.stroke();
      }
    });
  }, [elements]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    if (tool === 'pen' || tool === 'eraser') {
      setCurrentPoints([{ x, y }]);
    } else if (tool === 'rect') {
      setStartPos({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pen' || tool === 'eraser') {
      setCurrentPoints((prev) => [...prev, { x, y }]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pen') {
      setElements((prev) => [
        ...prev,
        { type: 'pen', color, points: [...currentPoints, { x, y }] },
      ]);
    } else if (tool === 'eraser') {
      setElements((prev) => [
        ...prev,
        { type: 'pen', color: '#0f172a', points: [...currentPoints, { x, y }] },
      ]);
    } else if (tool === 'rect' && startPos) {
      setElements((prev) => [
        ...prev,
        {
          type: 'rect',
          color,
          x: startPos.x,
          y: startPos.y,
          width: x - startPos.x,
          height: y - startPos.y,
        },
      ]);
    }
    setCurrentPoints([]);
    setStartPos(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi(`/boards/${blockId}/state`, {
        method: 'POST',
        body: JSON.stringify({ elementsJson: JSON.stringify(elements) }),
      });
    } catch (err) {
      console.error('Failed to save board:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setElements([]);
  };

  if (config && !config.enableCollaborativeBoards) {
    return (
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-md text-slate-500 text-sm flex items-center gap-2">
        <AlertCircle size={16} />
        Collaborative whiteboards are currently disabled by the administrator.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shadow-xl my-6">
      {/* Board Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-slate-800 border-b border-slate-700 gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              tool === 'pen' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Pencil size={15} /> Pen
          </button>

          <button
            onClick={() => setTool('rect')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              tool === 'rect' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Square size={15} /> Rectangle
          </button>

          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              tool === 'eraser' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Eraser size={15} /> Eraser
          </button>

          <div className="w-px h-6 bg-slate-700 mx-1" />

          {/* Color Palette */}
          {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-bold flex items-center gap-1"
          >
            <RotateCcw size={15} /> Clear
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Board'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-slate-950 flex justify-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair touch-none border border-slate-800 rounded-b-xl"
        />
      </div>
    </div>
  );
}
