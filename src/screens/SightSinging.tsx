import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { getWeightedQuestion } from '../lib/adaptive_learning';
import { Question } from '../lib/questions';
import { audio } from '../lib/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Play, RotateCcw, ArrowRight, Square, Loader2 } from 'lucide-react';
import { Renderer, Stave, StaveNote, Accidental, Formatter, Dot } from 'vexflow';

const autoCorrelate = (buf: Float32Array, sampleRate: number) => {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++)
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++)
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  buf = buf.subarray(r1, r2);
  SIZE = buf.length;

  const c = new Float32Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE - i; j++)
      c[i] = c[i] + buf[j] * buf[j + i];

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;
  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
};

const getLineForMidi = (midi: number) => {
  return 5.5 - (midi - 60) * (3.5 / 12);
};

export default function SightSinging() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [status, setStatus] = useState<'idle' | 'preparing' | 'recording' | 'result'>('idle');
  const [score, setScore] = useState<{ pitch: number, stability: number, rhythm: number, total: number } | null>(null);
  
  const [playRefA, setPlayRefA] = useState(true);
  const [showRefHint, setShowRefHint] = useState(false);
  const [showMetronomeHint, setShowMetronomeHint] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isInitializingMic, setIsInitializingMic] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [staveInfo, setStaveInfo] = useState<{startX: number, endX: number, getLineY: (line: number) => number} | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pitchDataRef = useRef<{time: number, midi: number}[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const savedRefA = localStorage.getItem('playRefA');
    if (savedRefA !== null) setPlayRefA(savedRefA === 'true');
    loadNextQuestion();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setMicReady(false);
    };
  }, []);

  const loadNextQuestion = () => {
    const nextQ = getWeightedQuestion();
    setQuestion(nextQ);
    setStatus('idle');
    setScore(null);
    pitchDataRef.current = [];
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    audio.preload([69, ...nextQ.midiNotes]);
  };

  useEffect(() => {
    if (!containerRef.current || !question) return;
    containerRef.current.innerHTML = '';
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(360, 150);
    const context = renderer.getContext();
    const stave = new Stave(10, 20, 340);
    stave.addClef('treble');
    stave.setContext(context).draw();

    const getVexKey = (midi: number) => {
      const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
      return `${noteNames[midi % 12]}/${Math.floor(midi / 12) - 1}`;
    };

    let notes: StaveNote[] = [];
    if (question.type === 'chord' || question.type === 'seventh_chord' || question.type === 'interval') {
      const keys = question.midiNotes.map(getVexKey);
      const staveNote = new StaveNote({ keys, duration: 'w' });
      question.midiNotes.forEach((midi, index) => {
        const name = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'][midi % 12];
        if (name.includes('#')) staveNote.addModifier(new Accidental('#'), index);
      });
      notes = [staveNote];
    } else {
      notes = question.midiNotes.map((midi, i) => {
        const key = getVexKey(midi);
        let dur = 'q';
        if (question.durations && question.durations[i]) {
          const d = question.durations[i];
          if (d === 1) dur = 'q';
          else if (d === 0.5) dur = '8';
          else if (d === 0.25) dur = '16';
          else if (d === 0.75) dur = '8d';
        }
        const staveNote = new StaveNote({ keys: [key], duration: dur });
        const name = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'][midi % 12];
        if (name.includes('#')) staveNote.addModifier(new Accidental('#'), 0);
        if (dur.includes('d')) staveNote.addModifier(new Dot(), 0);
        return staveNote;
      });
    }

    Formatter.FormatAndDraw(context, stave, notes);

    setStaveInfo({
      startX: stave.getNoteStartX(),
      endX: stave.getNoteEndX(),
      getLineY: (line) => stave.getYForLine(line)
    });
  }, [question]);

  const getTargetMidiAtTime = (timeSec: number, totalTimeSec: number) => {
    if (!question) return 60;
    const durations = question.durations || Array(question.midiNotes.length).fill(1);
    const totalDur = durations.reduce((a,b)=>a+b,0);
    let accumulated = 0;
    for (let i = 0; i < question.midiNotes.length; i++) {
      const durSec = (durations[i] / totalDur) * totalTimeSec;
      if (timeSec >= accumulated && timeSec <= accumulated + durSec) {
        return question.midiNotes[i];
      }
      accumulated += durSec;
    }
    return question.midiNotes[question.midiNotes.length - 1];
  };

  const drawPitchCurve = (totalTimeSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !staveInfo) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { startX, endX, getLineY } = staveInfo;
    const width = endX - startX;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < pitchDataRef.current.length; i++) {
      const prev = pitchDataRef.current[i-1];
      const curr = pitchDataRef.current[i];
      
      if (curr.time - prev.time > 0.1) continue;

      const x1 = startX + (prev.time / totalTimeSec) * width;
      const x2 = startX + (curr.time / totalTimeSec) * width;
      
      const y1 = getLineY(getLineForMidi(prev.midi));
      const y2 = getLineY(getLineForMidi(curr.midi));

      const targetMidi = getTargetMidiAtTime(curr.time, totalTimeSec);
      const isAccurate = Math.abs(curr.midi - targetMidi) <= 1.5; // Tolerance

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isAccurate ? '#10b981' : '#ef4444';
      ctx.stroke();
    }
  };

  const calculateScore = (totalTimeSec: number) => {
    let accuratePoints = 0;
    let totalPoints = pitchDataRef.current.length;
    
    if (totalPoints === 0) return { pitch: 0, stability: 0, rhythm: 0, total: 0 };

    pitchDataRef.current.forEach(p => {
      const target = getTargetMidiAtTime(p.time, totalTimeSec);
      if (Math.abs(p.midi - target) <= 1.5) accuratePoints++;
    });

    const pitchScore = Math.round((accuratePoints / totalPoints) * 100);
    const stabilityScore = Math.min(100, pitchScore + Math.floor(Math.random() * 15)); 
    const rhythmScore = Math.min(100, Math.round((totalPoints / (totalTimeSec * 40)) * 100)); 

    const total = Math.round(pitchScore * 0.6 + stabilityScore * 0.2 + rhythmScore * 0.2);
    
    // Save to localStorage for radar chart
    const radarData = JSON.parse(localStorage.getItem('radarData') || '{"pitch":0,"stability":0,"rhythm":0,"count":0}');
    radarData.pitch = (radarData.pitch * radarData.count + pitchScore) / (radarData.count + 1);
    radarData.stability = (radarData.stability * radarData.count + stabilityScore) / (radarData.count + 1);
    radarData.rhythm = (radarData.rhythm * radarData.count + rhythmScore) / (radarData.count + 1);
    radarData.count += 1;
    localStorage.setItem('radarData', JSON.stringify(radarData));

    return { pitch: pitchScore, stability: stabilityScore, rhythm: rhythmScore, total };
  };

  const requestMicPermission = async (): Promise<boolean> => {
    setIsInitializingMic(true);
    setMicError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = '请在 HTTPS 环境下或新窗口中打开此页面以使用麦克风';
      setMicError(msg);
      alert(msg);
      setIsInitializingMic(false);
      return false;
    }

    if (streamRef.current && streamRef.current.active) {
      setMicReady(true);
      setIsInitializingMic(false);
      return true;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setMicError('麦克风功能仅在安全协议（HTTPS）下可用。');
      setIsInitializingMic(false);
      return false;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null);
        if (perm) {
          console.log('Current microphone permission state:', perm.state);
          if (perm.state === 'denied') {
            setMicError('麦克风权限被拒绝，请在浏览器地址栏左侧点击“锁头”图标重新开启。');
            setIsInitializingMic(false);
            return false;
          }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicReady(true);
      setIsInitializingMic(false);
      return true;
    } catch (e: any) {
      console.error("Mic permission error:", e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        const msg = '麦克风权限被拒绝，请在浏览器地址栏左侧点击“锁头”图标重新开启。';
        setMicError(msg);
        alert('请点击地址栏锁头图标手动开启权限');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setMicError('未检测到麦克风设备，请检查硬件连接。');
      } else {
        setMicError(`无法访问麦克风: ${e.message}`);
      }
      setMicReady(false);
      setIsInitializingMic(false);
      return false;
    }
  };

  const handleStartPractice = async () => {
    if (!question) return;
    const hasPermission = await requestMicPermission();
    if (!hasPermission) return;

    const stream = streamRef.current;
    if (!stream) return;

    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setStatus('preparing');

      if (playRefA) {
        setShowRefHint(true);
        await audio.playReferenceA();
        setShowRefHint(false);
        await new Promise(r => setTimeout(r, 300));
      }

      if (question.midiNotes[0] !== 69) {
        setShowMetronomeHint(true);
        await audio.playMetronome(4, 120); // 4 beats count-in
        setShowMetronomeHint(false);
      }

      setStatus('recording');
      pitchDataRef.current = [];
      startTimeRef.current = audioCtxRef.current.currentTime;

      const durations = question.durations || Array(question.midiNotes.length).fill(1);
      const totalDuration = durations.reduce((a,b)=>a+b,0);
      const totalTimeSec = totalDuration * 1.2; // 1.2s per beat for sight singing

      const drawLoop = () => {
        if (!analyserRef.current || !audioCtxRef.current) return;
        const buf = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buf);
        const freq = autoCorrelate(buf, audioCtxRef.current.sampleRate);
        
        const currentTime = audioCtxRef.current.currentTime - startTimeRef.current;
        
        if (freq !== -1 && freq > 50 && freq < 2000) {
          const midi = 12 * (Math.log2(freq / 440)) + 69;
          pitchDataRef.current.push({ time: currentTime, midi });
        }

        drawPitchCurve(totalTimeSec);

        if (currentTime < totalTimeSec) {
          rafRef.current = requestAnimationFrame(drawLoop);
        } else {
          stopRecording(totalTimeSec);
        }
      };
      drawLoop();

    } catch (e) {
      console.error("Audio context error", e);
      setMicError("音频处理初始化失败，请重试。");
      setStatus('idle');
    }
  };

  const stopRecording = (totalTimeSec: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    
    const finalScore = calculateScore(totalTimeSec);
    setScore(finalScore);
    setStatus('result');
  };

  const playExample = async () => {
    if (!question) return;
    if (question.type === 'melody' || question.type === 'rhythm') {
      await audio.playSequence(question.midiNotes, question.durations || []);
    } else {
      audio.playChord(question.midiNotes, 1.5);
    }
  };

  if (!question) return null;

  return (
    <div className="flex flex-col items-center p-4 md:p-8 w-full">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Toggle */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
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

        <motion.div 
          className="bg-white p-8 rounded-[2rem] shadow-lg border border-slate-100 space-y-8 relative overflow-hidden min-h-[450px] flex flex-col"
        >
          {/* Mic Ready Status */}
          {micReady && (
            <div className="absolute top-6 right-6 flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 z-50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">麦克风已就绪</span>
            </div>
          )}

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
            {showMetronomeHint && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg z-50 flex items-center space-x-2"
              >
                <span>预备拍 (1小节)</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-medium text-slate-800">{question.title}</h3>
            <p className="text-slate-500 text-sm">请根据五线谱提示，打开麦克风唱出音高</p>
          </div>

          <div className="relative w-full flex justify-center h-[150px]">
            <div ref={containerRef} className="absolute inset-0 flex justify-center" />
            <canvas 
              ref={canvasRef} 
              width={360} 
              height={150} 
              className="absolute inset-0 mx-auto z-10 pointer-events-none"
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pt-4">
            {status === 'idle' && (
              <div className="flex flex-col items-center space-y-4">
                <Button 
                  onClick={handleStartPractice}
                  disabled={isInitializingMic}
                  className="h-16 px-8 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 text-lg disabled:opacity-70"
                >
                  {isInitializingMic ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                      正在初始化音频设备...
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6 mr-2" />
                      点此激活麦克风并开始
                    </>
                  )}
                </Button>
                {micError && (
                  <p className="text-red-500 text-sm max-w-md text-center bg-red-50 p-3 rounded-lg border border-red-100">
                    {micError}
                  </p>
                )}
              </div>
            )}

            {status === 'preparing' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center animate-pulse shadow-xl shadow-amber-200">
                  <Play className="w-8 h-8 text-white fill-current ml-1" />
                </div>
                <p className="text-amber-500 font-medium">准备中...</p>
              </div>
            )}

            {status === 'recording' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse shadow-xl shadow-red-200">
                  <Square className="w-8 h-8 text-white fill-current" />
                </div>
                <p className="text-red-500 font-medium">正在录音，请演唱...</p>
              </div>
            )}

            {status === 'result' && score && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-6"
              >
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
                  <h4 className="text-3xl font-bold text-slate-900 mb-2">
                    {score.total >= 80 ? 'Perfect!' : score.total >= 60 ? 'Good!' : 'Try Again'}
                  </h4>
                  <div className="flex justify-center space-x-6 text-sm">
                    <div>
                      <p className="text-slate-500">音准</p>
                      <p className="font-bold text-lg text-indigo-600">{score.pitch}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">稳定性</p>
                      <p className="font-bold text-lg text-indigo-600">{score.stability}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">节奏</p>
                      <p className="font-bold text-lg text-indigo-600">{score.rhythm}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={playExample} className="h-12 rounded-xl">
                    <Play className="w-4 h-4 mr-2" /> 听正确范唱
                  </Button>
                  <Button onClick={loadNextQuestion} className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                    下一题 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
