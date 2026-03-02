export type QuestionType = 'note' | 'interval' | 'chord' | 'seventh_chord' | 'melody' | 'rhythm';

export interface Question {
  id: number;
  title: string;
  type: QuestionType;
  midiNotes: number[];
  durations?: number[];
  options: string[];
  correctAnswer: string;
}

const generateQuestions = (): Question[] => {
  const questions: Question[] = [];
  let id = 1;

  // 1-10: 单音 (Notes)
  const notes = [
    { midi: [60], ans: 'C4 (中央C)' },
    { midi: [62], ans: 'D4' },
    { midi: [64], ans: 'E4' },
    { midi: [65], ans: 'F4' },
    { midi: [67], ans: 'G4' },
    { midi: [69], ans: 'A4' },
    { midi: [71], ans: 'B4' },
    { midi: [72], ans: 'C5' },
    { midi: [55], ans: 'G3' },
    { midi: [57], ans: 'A3' },
  ];
  notes.forEach((n, i) => {
    questions.push({
      id: id++,
      title: `听辨单音 (${i + 1}/10)`,
      type: 'note',
      midiNotes: n.midi,
      options: [],
      correctAnswer: n.ans
    });
  });
  questions.slice(0, 10).forEach(q => {
    const allOptions = ['C4 (中央C)', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'G3', 'A3'];
    const opts = new Set([q.correctAnswer]);
    while(opts.size < 4) {
      opts.add(allOptions[Math.floor(Math.random() * allOptions.length)]);
    }
    q.options = Array.from(opts).sort(() => Math.random() - 0.5);
  });

  // 11-20: 音程 (Intervals)
  const intervals = [
    { midi: [60, 62], ans: '大二度' },
    { midi: [60, 63], ans: '小三度' },
    { midi: [60, 64], ans: '大三度' },
    { midi: [60, 65], ans: '纯四度' },
    { midi: [60, 66], ans: '增四度/减五度' },
    { midi: [60, 67], ans: '纯五度' },
    { midi: [60, 68], ans: '小六度' },
    { midi: [60, 69], ans: '大六度' },
    { midi: [60, 70], ans: '小七度' },
    { midi: [60, 71], ans: '大七度' },
  ];
  intervals.forEach((inv, i) => {
    const allOptions = ['大二度', '小三度', '大三度', '纯四度', '增四度/减五度', '纯五度', '小六度', '大六度', '小七度', '大七度'];
    const opts = new Set([inv.ans]);
    while(opts.size < 4) {
      opts.add(allOptions[Math.floor(Math.random() * allOptions.length)]);
    }
    questions.push({
      id: id++,
      title: `听辨音程 (${i + 1}/10)`,
      type: 'interval',
      midiNotes: inv.midi,
      options: Array.from(opts).sort(() => Math.random() - 0.5),
      correctAnswer: inv.ans
    });
  });

  // 21-30: 三和弦 (Triads)
  const chords = [
    { midi: [60, 64, 67], ans: '大三和弦' },
    { midi: [60, 63, 67], ans: '小三和弦' },
    { midi: [60, 64, 68], ans: '增三和弦' },
    { midi: [60, 63, 66], ans: '减三和弦' },
    { midi: [62, 66, 69], ans: '大三和弦' },
    { midi: [62, 65, 69], ans: '小三和弦' },
    { midi: [65, 69, 72], ans: '大三和弦' },
    { midi: [64, 67, 71], ans: '小三和弦' },
    { midi: [67, 71, 74], ans: '大三和弦' },
    { midi: [71, 74, 77], ans: '减三和弦' },
  ];
  chords.forEach((c, i) => {
    const allOptions = ['大三和弦', '小三和弦', '增三和弦', '减三和弦'];
    questions.push({
      id: id++,
      title: `听辨三和弦 (${i + 1}/10)`,
      type: 'chord',
      midiNotes: c.midi,
      options: allOptions,
      correctAnswer: c.ans
    });
  });

  // 31-40: 七和弦 (Seventh Chords)
  const sevenths = [
    { midi: [60, 64, 67, 71], ans: '大大七和弦' },
    { midi: [60, 64, 67, 70], ans: '大小七和弦' },
    { midi: [60, 63, 67, 70], ans: '小三小七和弦 (小小七)' },
    { midi: [60, 63, 66, 70], ans: '减小七和弦 (半减七)' },
    { midi: [60, 63, 66, 69], ans: '减减七和弦' },
    { midi: [62, 66, 69, 72], ans: '大小七和弦' },
    { midi: [62, 65, 68, 72], ans: '减小七和弦 (半减七)' },
    { midi: [65, 69, 72, 76], ans: '大大七和弦' },
    { midi: [67, 71, 74, 77], ans: '大小七和弦' },
    { midi: [71, 74, 77, 80], ans: '减小七和弦 (半减七)' },
  ];
  sevenths.forEach((s, i) => {
    const allOptions = ['大大七和弦', '大小七和弦', '小三小七和弦 (小小七)', '减小七和弦 (半减七)', '减减七和弦'];
    const opts = new Set([s.ans]);
    while(opts.size < 4) {
      opts.add(allOptions[Math.floor(Math.random() * allOptions.length)]);
    }
    questions.push({
      id: id++,
      title: `听辨七和弦 (${i + 1}/10)`,
      type: 'seventh_chord',
      midiNotes: s.midi,
      options: Array.from(opts).sort(() => Math.random() - 0.5),
      correctAnswer: s.ans
    });
  });

  // 41-45: 旋律听辨 (Melody)
  const melodies = [
    { midi: [60, 62, 64, 65, 67], dur: [0.5, 0.5, 0.5, 0.5, 1], ans: 'C4 - D4 - E4 - F4 - G4' },
    { midi: [67, 65, 64, 62, 60], dur: [0.5, 0.5, 0.5, 0.5, 1], ans: 'G4 - F4 - E4 - D4 - C4' },
    { midi: [60, 64, 67, 64, 60], dur: [0.5, 0.5, 0.5, 0.5, 1], ans: 'C4 - E4 - G4 - E4 - C4' },
    { midi: [60, 60, 67, 67, 69, 69, 67], dur: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], ans: 'C4 - C4 - G4 - G4 - A4 - A4 - G4' },
    { midi: [64, 62, 60, 62, 64, 64, 64], dur: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], ans: 'E4 - D4 - C4 - D4 - E4 - E4 - E4' },
  ];
  melodies.forEach((m, i) => {
    const allOptions = [
      'C4 - D4 - E4 - F4 - G4', 
      'G4 - F4 - E4 - D4 - C4', 
      'C4 - E4 - G4 - E4 - C4', 
      'C4 - C4 - G4 - G4 - A4 - A4 - G4', 
      'E4 - D4 - C4 - D4 - E4 - E4 - E4', 
      'E4 - F4 - G4 - A4 - B4'
    ];
    const opts = new Set([m.ans]);
    while(opts.size < 4) {
      opts.add(allOptions[Math.floor(Math.random() * allOptions.length)]);
    }
    questions.push({
      id: id++,
      title: `旋律听辨 (${i + 1}/5)`,
      type: 'melody',
      midiNotes: m.midi,
      durations: m.dur,
      options: Array.from(opts).sort(() => Math.random() - 0.5),
      correctAnswer: m.ans
    });
  });

  // 46-50: 节奏听辨 (Rhythm)
  const rhythms = [
    { midi: [60, 60, 60, 60], dur: [1, 1, 1, 1], ans: '♩ ♩ ♩ ♩' },
    { midi: [60, 60, 60, 60, 60], dur: [0.5, 0.5, 1, 1, 1], ans: '♪ ♪ ♩ ♩ ♩' },
    { midi: [60, 60, 60, 60], dur: [0.5, 1, 0.5, 1], ans: '♪ ♩ ♪ ♩' },
    { midi: [60, 60, 60, 60], dur: [0.33, 0.33, 0.33, 1], ans: '♪(3) ♪(3) ♪(3) ♩' },
    { midi: [60, 60, 60, 60, 60, 60], dur: [0.75, 0.25, 1, 0.5, 0.5, 1], ans: '♪. ♬ ♩ ♪ ♪ ♩' },
  ];
  rhythms.forEach((r, i) => {
    const allOptions = ['♩ ♩ ♩ ♩', '♪ ♪ ♩ ♩ ♩', '♪ ♩ ♪ ♩', '♪(3) ♪(3) ♪(3) ♩', '♪. ♬ ♩ ♪ ♪ ♩', '♩ ♪ ♪ ♩ ♩'];
    const opts = new Set([r.ans]);
    while(opts.size < 4) {
      opts.add(allOptions[Math.floor(Math.random() * allOptions.length)]);
    }
    questions.push({
      id: id++,
      title: `节奏听辨 (${i + 1}/5)`,
      type: 'rhythm',
      midiNotes: r.midi,
      durations: r.dur,
      options: Array.from(opts).sort(() => Math.random() - 0.5),
      correctAnswer: r.ans
    });
  });

  return questions;
};

export const questions = generateQuestions();
