import React, { useState, useEffect } from 'react';
import Welcome from './screens/Welcome';
import Assessment from './screens/Assessment';
import Goal from './screens/Goal';
import TrainingHub from './screens/TrainingHub';
import { audio } from './lib/audio';

type AppState = 'welcome' | 'assessment' | 'goal' | 'hub';

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('welcome');

  useEffect(() => {
    // Initialization moved to user interactions
  }, []);

  const handleSkipAssessment = () => {
    if (localStorage.getItem('goalSchool')) {
      setCurrentState('hub');
    } else {
      setCurrentState('goal');
    }
  };

  const handleAssessmentComplete = () => {
    localStorage.setItem('assessment_completed', 'true');
    setCurrentState('goal');
  };

  return (
    <div className="min-h-screen w-full font-sans text-slate-900 antialiased">
      {currentState === 'welcome' && (
        <Welcome 
          onStart={() => setCurrentState('assessment')} 
          onSkip={handleSkipAssessment}
        />
      )}
      {currentState === 'assessment' && (
        <Assessment onComplete={handleAssessmentComplete} />
      )}
      {currentState === 'goal' && (
        <Goal onStart={() => setCurrentState('hub')} />
      )}
      {currentState === 'hub' && (
        <TrainingHub />
      )}
    </div>
  );
}
