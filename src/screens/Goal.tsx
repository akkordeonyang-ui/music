import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';

interface GoalProps {
  onStart: () => void;
}

export default function Goal({ onStart }: GoalProps) {
  const [school, setSchool] = useState('');
  const [score, setScore] = useState('');
  const [dailyQuestions, setDailyQuestions] = useState(100);

  const handleStart = () => {
    localStorage.setItem('goalSchool', school);
    localStorage.setItem('goalScore', score);
    localStorage.setItem('dailyQuestions', dailyQuestions.toString());
    localStorage.setItem('dailyProgress', '0');
    onStart();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">设定目标</h2>
          <p className="text-slate-500">定制你的专属训练计划</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">目标院校</label>
            <input 
              type="text" 
              placeholder="例如：中央音乐学院、上海音乐学院"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">目标分数 (视唱练耳)</label>
            <input 
              type="number" 
              placeholder="例如：90"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">每日训练量 (题)</label>
            <input 
              type="number" 
              value={dailyQuestions}
              onChange={(e) => setDailyQuestions(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <Button size="lg" className="w-full rounded-xl text-lg h-14" onClick={handleStart}>
          开启训练
        </Button>
      </motion.div>
    </div>
  );
}
