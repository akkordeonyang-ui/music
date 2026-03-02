import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { getWeightedQuestion, updateCombo, getStats } from '../lib/adaptive_learning';
import { Question } from '../lib/questions';
import { audio } from '../lib/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Play, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Staff from '../components/Staff';

export default function Practice() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [combo, setCombo] = useState(0);
  const [dailyProgress, setDailyProgress] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(100);
  const [shake, setShake] = useState(false);
  
  const [playRefA, setPlayRefA] = useState(true);
  const [isFirstPlay, setIsFirstPlay] = useState(true);
  const [showRefHint, setShowRefHint] = useState(false);

  useEffect(() => {
    const goal = parseInt(localStorage.getItem('dailyQuestions') || '100', 10);
    const progress = parseInt(localStorage.getItem('dailyProgress') || '0', 10);
    const savedRefA = localStorage.getItem('playRefA');
    if (savedRefA !== null) setPlayRefA(savedRefA === 'true');
    
    setDailyGoal(goal);
    setDailyProgress(progress);
    loadNextQuestion();
  }, []);

  const loadNextQuestion = () => {
    const nextQ = getWeightedQuestion();
    setQuestion(nextQ);
    setStatus('idle');
    setIsFirstPlay(true);
    audio.preload([69, ...nextQ.midiNotes]); // Preload A4 and question notes
  };

  const handlePlay = async () => {
    if (!question || isPlaying) return;
    setIsPlaying(true);

    if (isFirstPlay && playRefA) {
      setShowRefHint(true);
      await audio.playReferenceA();
      setShowRefHint(false);
      await new Promise(r => setTimeout(r, 300)); // Small gap
    }
    setIsFirstPlay(false);

    if (question.type === 'melody' || question.type === 'rhythm') {
      await audio.playSequence(question.midiNotes, question.durations || []);
    } else if (question.type === 'chord' || question.type === 'seventh_chord' || question.type === 'interval') {
      audio.playChord(question.midiNotes, 1.5);
      await new Promise(r => setTimeout(r, 1500));
    } else {
      audio.playNote(question.midiNotes[0], 1.5);
      await new Promise(r => setTimeout(r, 1500));
    }

    setIsPlaying(false);
  };

  const playMelodyOption = async (option: any) => {
    if (isPlaying) return;
    setIsPlaying(true);
    await audio.playSequence(option.midiNotes, option.durations || []);
    setIsPlaying(false);
  };

  const handleAnswer = (option: string) => {
    if (!question || isPlaying) return;

    const isCorrect = option === question.correctAnswer;
    
    if (isCorrect) {
      if (status === 'wrong') {
        // They finally got it right after being forced to listen
        setStatus('correct');
        return;
      }

      setStatus('correct');
      updateCombo(question.type, true);
      
      // Play success ding (force oscillator for UI sound)
      audio.playNote(84, 0.2, true); // C6
      setTimeout(() => audio.playNote(88, 0.4, true), 100); // E6

      const stats = getStats();
      setCombo(stats.combos[question.type] || 0);
      
      const newProgress = dailyProgress + 1;
      setDailyProgress(newProgress);
      localStorage.setItem('dailyProgress', newProgress.toString());
    } else {
      setStatus('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      updateCombo(question.type, false);
      setCombo(0);
      
      // Play error buzz (force oscillator for UI sound)
      audio.playNote(40, 0.3, true); // E2
    }
  };

  if (!question) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">今日目标</p>
              <p className="text-2xl font-bold text-slate-900">{dailyProgress} <span className="text-lg text-slate-400 font-normal">/ {dailyGoal}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-500 mb-1">当前连对</p>
              <p className="text-2xl font-bold text-indigo-600">{combo} <span className="text-lg text-indigo-400 font-normal">Combo</span></p>
            </div>
          </div>
          <Progress value={(dailyProgress / dailyGoal) * 100} className="h-3" />
          
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-sm font-medium text-slate-600">播放前提示标准音 (A4)</span>
            <button 
              onClick={() => {
                const newVal = !playRefA;
                setPlayRefA(newVal);
                localStorage.setItem('playRefA', String(newVal));
              }}
              className={`w-12 h-6 rounded-full transition-colors relative ${playRefA ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${playRefA ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* Main Card */}
        <motion.div 
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-white p-8 rounded-[2rem] shadow-lg border border-slate-100 space-y-8 relative overflow-hidden min-h-[400px] flex flex-col"
        >
          {/* Reference A Hint Overlay */}
          <AnimatePresence>
            {showRefHint && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg z-50 flex items-center space-x-2"
              >
                <span>标准音 A4</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Overlay */}
          <AnimatePresence>
            {status === 'wrong' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-red-500/5 flex items-center justify-center pointer-events-none z-10"
              >
                <XCircle className="w-32 h-32 text-red-500 opacity-10" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center space-y-2 relative z-20">
            <h3 className="text-xl font-medium text-slate-800">{question.title}</h3>
            {status === 'wrong' && (
              <p className="text-red-500 font-medium animate-pulse">
                请再次点击播放听辨正确答案：{question.correctAnswer}
              </p>
            )}
          </div>

          {status === 'correct' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center space-y-6 relative z-20"
            >
              <div className="flex items-center space-x-2 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-xl font-bold">回答正确！</span>
              </div>
              
              <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-center text-slate-600 font-medium mb-2">{question.correctAnswer}</p>
                <Staff midiNotes={question.midiNotes} durations={question.durations} type={question.type} />
              </div>

              <Button 
                onClick={loadNextQuestion}
                className="w-full h-14 text-lg rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200"
              >
                下一题 <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="flex justify-center py-8 relative z-20">
                <button
                  onClick={handlePlay}
                  disabled={isPlaying}
                  className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                    ${isPlaying ? 'bg-indigo-100 scale-95' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}
                    ${status === 'wrong' && !isPlaying ? 'bg-red-500 shadow-red-200 animate-bounce' : ''}
                  `}
                >
                  <Play className={`w-16 h-16 ${isPlaying ? 'text-indigo-600' : 'text-white'} ml-2`} fill="currentColor" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-20">
                {question.options.map((option, idx) => {
                  const isMelodyOption = typeof option === 'object' && option !== null && 'id' in option;
                  const optionId = isMelodyOption ? (option as any).id : option as string;
                  const isCorrectOption = optionId === question.correctAnswer;

                  if (isMelodyOption) {
                    const melodyOpt = option as any;
                    let cardClass = "relative rounded-2xl border-2 overflow-hidden transition-all bg-white flex flex-col ";
                    if (status === 'wrong') {
                      if (isCorrectOption) {
                        cardClass += " border-red-500 ring-2 ring-red-500";
                      } else {
                        cardClass += " border-slate-200 opacity-50";
                      }
                    } else {
                      cardClass += " border-slate-200 hover:border-indigo-300 hover:shadow-md";
                    }

                    return (
                      <div key={idx} className={cardClass}>
                        <div 
                          className="flex-1 p-2 cursor-pointer flex items-center justify-center" 
                          onClick={() => playMelodyOption(melodyOpt)}
                        >
                          <Staff midiNotes={melodyOpt.midiNotes} durations={melodyOpt.durations} type="melody" />
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                          <button 
                            onClick={() => playMelodyOption(melodyOpt)} 
                            disabled={isPlaying}
                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors disabled:opacity-50"
                            title="播放此选项"
                          >
                            <Play className="w-5 h-5" fill="currentColor" />
                          </button>
                          <Button 
                            onClick={() => handleAnswer(optionId)} 
                            disabled={isPlaying || (status === 'wrong' && !isCorrectOption)}
                            variant="secondary" 
                            size="sm"
                            className="font-medium"
                          >
                            选择此项
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  let btnVariant: 'outline' | 'primary' | 'secondary' = 'outline';
                  let btnClass = "h-auto py-5 text-lg rounded-2xl whitespace-normal transition-all";
                  
                  if (status === 'wrong') {
                    if (isCorrectOption) {
                      btnClass += " border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500";
                    } else {
                      btnClass += " opacity-50";
                    }
                  }

                  return (
                    <Button
                      key={idx}
                      variant={btnVariant}
                      onClick={() => handleAnswer(optionId)}
                      disabled={isPlaying || (status === 'wrong' && !isCorrectOption)}
                      className={btnClass}
                    >
                      {option as string}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
