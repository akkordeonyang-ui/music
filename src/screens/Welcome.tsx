import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';
import { audio } from '../lib/audio';

interface WelcomeProps {
  onStart: () => void;
  onSkip: () => void;
}

export default function Welcome({ onStart, onSkip }: WelcomeProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('assessment_completed') === 'true') {
      setIsCompleted(true);
    }
  }, []);

  const handleStartClick = () => {
    onStart();
  };

  const handleSkipClick = () => {
    localStorage.setItem('assessment_completed', 'true');
    onSkip();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl w-full text-center space-y-8"
      >
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 font-sans">
            视唱练耳智能训练系统
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-light">
            面向中国艺术考生的 AI 辅助学习工具
          </p>
        </div>

        <div className="pt-12 flex flex-col items-center space-y-4">
          <Button 
            size="lg" 
            onClick={isCompleted ? handleSkipClick : handleStartClick} 
            className="text-lg rounded-full px-12 py-6 shadow-lg shadow-indigo-200"
          >
            {isCompleted ? '继续我的训练' : '开始 50 题水平测验'}
          </Button>
          
          {!isCompleted && (
            <button 
              onClick={handleSkipClick}
              className="text-slate-500 hover:text-slate-700 underline underline-offset-4 text-sm transition-colors mt-4 cursor-pointer"
            >
              跳过测评，直接进入练习
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
