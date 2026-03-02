import { Question, QuestionType } from './questions';

export interface UserStats {
  scores: Record<QuestionType, number>;
  combos: Record<QuestionType, number>;
  level: Record<QuestionType, number>;
}

const DEFAULT_STATS: UserStats = {
  scores: { note: 0, interval: 0, chord: 0, seventh_chord: 0, melody: 0, rhythm: 0 },
  combos: { note: 0, interval: 0, chord: 0, seventh_chord: 0, melody: 0, rhythm: 0 },
  level: { note: 1, interval: 1, chord: 1, seventh_chord: 1, melody: 1, rhythm: 1 }
};

export const getStats = (): UserStats => {
  const storedScores = localStorage.getItem('assessmentScores');
  const storedCombos = localStorage.getItem('practiceCombos');
  const storedLevel = localStorage.getItem('practiceLevels');

  const stats = { ...DEFAULT_STATS };
  if (storedScores) stats.scores = { ...stats.scores, ...JSON.parse(storedScores) };
  if (storedCombos) stats.combos = { ...stats.combos, ...JSON.parse(storedCombos) };
  if (storedLevel) stats.level = { ...stats.level, ...JSON.parse(storedLevel) };

  return stats;
};

export const updateCombo = (type: QuestionType, isCorrect: boolean) => {
  const stats = getStats();
  if (isCorrect) {
    stats.combos[type] = (stats.combos[type] || 0) + 1;
    if (stats.combos[type] >= 5) {
      stats.level[type] = (stats.level[type] || 1) + 1;
      stats.combos[type] = 0; // Reset combo for next level
    }
  } else {
    stats.combos[type] = 0;
  }
  localStorage.setItem('practiceCombos', JSON.stringify(stats.combos));
  localStorage.setItem('practiceLevels', JSON.stringify(stats.level));
};

export const getWeightedQuestionType = (): QuestionType => {
  const stats = getStats();
  const scores = stats.scores;
  
  const maxScores: Record<QuestionType, number> = {
    note: 10, interval: 10, chord: 10, seventh_chord: 10, melody: 5, rhythm: 5
  };

  const percentages: Record<QuestionType, number> = {
    note: (scores.note || 0) / maxScores.note,
    interval: (scores.interval || 0) / maxScores.interval,
    chord: (scores.chord || 0) / maxScores.chord,
    seventh_chord: (scores.seventh_chord || 0) / maxScores.seventh_chord,
    melody: (scores.melody || 0) / maxScores.melody,
    rhythm: (scores.rhythm || 0) / maxScores.rhythm,
  };

  const isWeakSeventh = percentages.seventh_chord < 0.6;
  const isWeakMelody = percentages.melody < 0.6;

  let weights: Record<QuestionType, number> = {
    note: 10, interval: 10, chord: 10, seventh_chord: 10, melody: 10, rhythm: 10
  };

  if (isWeakSeventh && isWeakMelody) {
    weights.seventh_chord = 30;
    weights.melody = 30;
    weights.note = 10;
    weights.interval = 10;
    weights.chord = 10;
    weights.rhythm = 10;
  } else if (isWeakSeventh) {
    weights.seventh_chord = 60;
    weights.melody = 8;
    weights.note = 8;
    weights.interval = 8;
    weights.chord = 8;
    weights.rhythm = 8;
  } else if (isWeakMelody) {
    weights.melody = 60;
    weights.seventh_chord = 8;
    weights.note = 8;
    weights.interval = 8;
    weights.chord = 8;
    weights.rhythm = 8;
  } else {
    Object.keys(weights).forEach(k => {
      const type = k as QuestionType;
      weights[type] = Math.max(1, 100 - (percentages[type] * 100));
    });
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (const [type, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return type as QuestionType;
  }
  
  return 'note';
};

export const generateDynamicQuestion = (type: QuestionType, level: number): Question => {
  const id = Date.now();
  let title = '';
  let midiNotes: number[] = [];
  let durations: number[] | undefined;
  let options: string[] = [];
  let correctAnswer = '';

  const randomMidi = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const getNoteName = (midi: number) => `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`;

  if (type === 'note') {
    title = `单音听辨 (Lv.${level})`;
    const min = level === 1 ? 60 : level === 2 ? 48 : 36;
    const max = level === 1 ? 72 : level === 2 ? 84 : 96;
    const note = randomMidi(min, max);
    midiNotes = [note];
    correctAnswer = getNoteName(note);
    options = [correctAnswer];
    while(options.length < 4) {
      const opt = getNoteName(randomMidi(min, max));
      if (!options.includes(opt)) options.push(opt);
    }
  } else if (type === 'interval') {
    title = `音程听辨 (Lv.${level})`;
    const base = randomMidi(48, 72);
    const intervalNames = ['纯一度', '小二度', '大二度', '小三度', '大三度', '纯四度', '增四度/减五度', '纯五度', '小六度', '大六度', '小七度', '大七度', '纯八度', '小九度', '大九度'];
    const maxInterval = level === 1 ? 12 : 14;
    const interval = randomMidi(1, maxInterval);
    midiNotes = [base, base + interval];
    correctAnswer = intervalNames[interval];
    options = [correctAnswer];
    while(options.length < 4) {
      const opt = intervalNames[randomMidi(1, maxInterval)];
      if (!options.includes(opt)) options.push(opt);
    }
  } else if (type === 'chord') {
    title = `三和弦听辨 (Lv.${level})`;
    const base = randomMidi(48, 72);
    const chordTypes = [
      { name: '大三和弦', intervals: [0, 4, 7] },
      { name: '小三和弦', intervals: [0, 3, 7] },
      { name: '增三和弦', intervals: [0, 4, 8] },
      { name: '减三和弦', intervals: [0, 3, 6] },
    ];
    const chord = chordTypes[Math.floor(Math.random() * chordTypes.length)];
    let notes = chord.intervals.map(i => base + i);
    
    if (level > 1) {
      const inversion = Math.floor(Math.random() * 3);
      if (inversion === 1) notes[0] += 12;
      if (inversion === 2) { notes[0] += 12; notes[1] += 12; }
      notes.sort((a,b) => a-b);
      correctAnswer = `${chord.name} (${inversion === 0 ? '原位' : inversion === 1 ? '第一转位' : '第二转位'})`;
    } else {
      correctAnswer = chord.name;
    }
    midiNotes = notes;
    options = [correctAnswer];
    while(options.length < 4) {
      const optChord = chordTypes[Math.floor(Math.random() * chordTypes.length)];
      let optName = optChord.name;
      if (level > 1) {
        const inv = Math.floor(Math.random() * 3);
        optName = `${optChord.name} (${inv === 0 ? '原位' : inv === 1 ? '第一转位' : '第二转位'})`;
      }
      if (!options.includes(optName)) options.push(optName);
    }
  } else if (type === 'seventh_chord') {
    title = `七和弦听辨 (Lv.${level})`;
    const base = randomMidi(48, 72);
    const chordTypes = [
      { name: '大大七和弦', intervals: [0, 4, 7, 11] },
      { name: '大小七和弦', intervals: [0, 4, 7, 10] },
      { name: '小小七和弦', intervals: [0, 3, 7, 10] },
      { name: '减小七和弦', intervals: [0, 3, 6, 10] },
      { name: '减减七和弦', intervals: [0, 3, 6, 9] },
    ];
    const chord = chordTypes[Math.floor(Math.random() * chordTypes.length)];
    let notes = chord.intervals.map(i => base + i);
    if (level > 1) {
      const inversion = Math.floor(Math.random() * 4);
      for(let i=0; i<inversion; i++) notes[i] += 12;
      notes.sort((a,b) => a-b);
      correctAnswer = `${chord.name} (${inversion === 0 ? '原位' : `第${inversion}转位`})`;
    } else {
      correctAnswer = chord.name;
    }
    midiNotes = notes;
    options = [correctAnswer];
    while(options.length < 4) {
      const optChord = chordTypes[Math.floor(Math.random() * chordTypes.length)];
      let optName = optChord.name;
      if (level > 1) {
        const inv = Math.floor(Math.random() * 4);
        optName = `${optChord.name} (${inv === 0 ? '原位' : `第${inv}转位`})`;
      }
      if (!options.includes(optName)) options.push(optName);
    }
  } else if (type === 'melody') {
    title = `旋律听辨 (Lv.${level})`;
    const length = level === 1 ? 5 : level === 2 ? 7 : 9;
    const base = randomMidi(60, 72);
    const scale = [0, 2, 4, 5, 7, 9, 11];
    midiNotes = Array.from({length}, () => base + scale[Math.floor(Math.random() * scale.length)]);
    durations = Array.from({length}, () => Math.random() > 0.5 ? 0.5 : 1);
    
    const getNoteName = (midi: number) => {
      const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
      const octave = Math.floor(midi / 12) - 1;
      return `${noteNames[midi % 12]}${octave}`;
    };
    
    correctAnswer = midiNotes.map(getNoteName).join(' - ');
    options = [correctAnswer];
    while(options.length < 4) {
      const optMidi = Array.from({length}, () => base + scale[Math.floor(Math.random() * scale.length)]);
      const opt = optMidi.map(getNoteName).join(' - ');
      if (!options.includes(opt)) options.push(opt);
    }
  } else if (type === 'rhythm') {
    title = `节奏听辨 (Lv.${level})`;
    const length = level === 1 ? 4 : level === 2 ? 6 : 8;
    midiNotes = Array(length).fill(60);
    const possibleDurations = level === 1 ? [1, 0.5] : [1, 0.5, 0.25, 0.33, 0.75];
    durations = Array.from({length}, () => possibleDurations[Math.floor(Math.random() * possibleDurations.length)]);
    
    const formatDuration = (d: number) => {
      if (d === 1) return '♩';
      if (d === 0.5) return '♪';
      if (d === 0.25) return '♬';
      if (d === 0.75) return '♪.';
      if (d === 0.33) return '♪(3)';
      return d.toString();
    };
    
    correctAnswer = durations.map(formatDuration).join(' ');
    options = [correctAnswer];
    while(options.length < 4) {
      const optDur = Array.from({length}, () => possibleDurations[Math.floor(Math.random() * possibleDurations.length)]);
      const opt = optDur.map(formatDuration).join(' ');
      if (!options.includes(opt)) options.push(opt);
    }
  }

  return {
    id,
    title,
    type,
    midiNotes,
    durations,
    options: options.sort(() => Math.random() - 0.5),
    correctAnswer
  };
};

export const getWeightedQuestion = (): Question => {
  const type = getWeightedQuestionType();
  const stats = getStats();
  const level = stats.level[type] || 1;
  return generateDynamicQuestion(type, level);
};
