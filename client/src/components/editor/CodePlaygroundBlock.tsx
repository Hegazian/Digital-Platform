"use client";

import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { errorMessage } from '../../lib/apiTypes';
import { useConfigStore } from '../../lib/configStore';

interface CodePlaygroundBlockProps {
  initialCode?: string;
  language?: string;
}

export default function CodePlaygroundBlock({ initialCode = 'print("Hello, EduPlatform!")', language = 'python' }: CodePlaygroundBlockProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  
  const { config } = useConfigStore();

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      const res = await fetchApi('/playgrounds/execute', {
        method: 'POST',
        body: JSON.stringify({ code, language }),
      });

      if (res.success) {
        setOutput(res.data.output);
        if (res.data.error) setError(res.data.error);
      } else {
        setError(res.message || 'Execution failed');
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Network error executing code'));
    } finally {
      setIsRunning(false);
    }
  };

  if (config && !config.enableCodePlaygrounds) {
    return (
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-md text-slate-500 text-sm flex items-center gap-2">
        <AlertCircle size={16} />
        Code playgrounds are currently disabled by the administrator.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shadow-lg my-6">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="ml-2 text-xs font-mono text-slate-400 capitalize">{language} Environment</span>
        </div>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold transition-colors disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700">
        <div className="relative">
          <CodeMirror
            value={code}
            height="300px"
            theme="dark"
            extensions={[python()]}
            onChange={(value) => setCode(value)}
            className="text-sm"
          />
        </div>
        <div className="p-4 bg-slate-950 font-mono text-sm overflow-y-auto h-[300px]">
          {output && (
            <div className="text-slate-300 whitespace-pre-wrap">{output}</div>
          )}
          {error && (
            <div className="text-red-400 whitespace-pre-wrap mt-2 pt-2 border-t border-red-900/50">
              {error}
            </div>
          )}
          {!output && !error && !isRunning && (
            <div className="text-slate-600 flex h-full items-center justify-center italic">
              Output will appear here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
