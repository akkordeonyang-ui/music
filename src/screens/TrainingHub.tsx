import React, { useState } from 'react';
import Practice from './Practice';
import SightSinging from './SightSinging';

export default function TrainingHub() {
  const [mode, setMode] = useState<'ear' | 'sight'>('ear');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 p-4 flex justify-center sticky top-0 z-50">
        <div className="bg-slate-100 p-1 rounded-xl flex space-x-1">
          <button 
            onClick={() => setMode('ear')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'ear' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
          >
            听音模式 (被动)
          </button>
          <button 
            onClick={() => setMode('sight')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'sight' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
          >
            视唱模式 (主动)
          </button>
        </div>
      </div>
      <div className="flex-1">
        {mode === 'ear' ? <Practice /> : <SightSinging />}
      </div>
    </div>
  );
}
