import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { questions } from '../lib/questions';
import { audio } from '../lib/audio';
import { motion } from 'motion/react';

interface AssessmentProps {
  onComplete: () => void;
}

export default function Assessment({ onComplete }: AssessmentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({
    note: 0,
    interval: 0,
    chord: 0,
    seventh_chord: 0,
    melody: 0,
    rhythm: 0
  });

  const question = questions[currentIndex];

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

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

  const handleAnswer = (option: string) => {
    if (isPlaying) return;

    const isCorrect = option === question.correctAnswer;
    
    // Update score
    const newScores = { ...scores };
    if (isCorrect) {
      newScores[question.type] += 1;
    }
    setScores(newScores);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished
      localStorage.setItem('assessmentScores', JSON.stringify(newScores));
      localStorage.setItem('assessment_completed', 'true');
      onComplete();
    }
  };

  useEffect(() => {
    if (question) {
      audio.preload(question.midiNotes);
    }
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      audio.stopSequence();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
      <div className="w-full max-w-2xl space-y-8 mt-12">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium text-slate-500">
            <span>{question.title}</span>
            <span>第 {currentIndex + 1} / {questions.length} 题</span>
          </div>
          <Progress value={(currentIndex / questions.length) * 100} />
        </div>

        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-8"
        >
          <div className="flex justify-center py-8">
            <Button 
              size="lg" 
              onClick={handlePlay} 
              disabled={isPlaying}
              className="w-48 h-48 rounded-full text-xl shadow-md"
            >
              {isPlaying ? '播放中...' : '播放音频'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.options.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="lg"
                onClick={() => handleAnswer(option)}
                disabled={isPlaying}
                className="h-auto py-4 text-base whitespace-normal"
              >
                {option}
              </Button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
