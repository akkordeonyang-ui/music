export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlayingSequence = false;
  private audioBuffers: Map<number, AudioBuffer> = new Map();
  private convolver: ConvolverNode | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      
      // Setup Reverb for a realistic exam hall sound
      this.convolver = this.ctx.createConvolver();
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = 0.35; // Reverb wet level
      this.convolver.connect(reverbGain);
      reverbGain.connect(this.masterGain);
      
      this.generateImpulseResponse();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private generateImpulseResponse() {
    if (!this.ctx || !this.convolver) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 0.3; // 0.3 seconds reverb tail
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (sampleRate * 0.1));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    this.convolver.buffer = impulse;
  }

  private getNoteName(midi: number): string {
    const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const name = noteNames[midi % 12];
    return `${name}${octave}`;
  }

  public async preloadCore() {
    const coreMidis = [];
    for (let i = 48; i <= 84; i++) coreMidis.push(i); // C3 to C6
    await this.preload(coreMidis);
  }

  public async preload(midiNumbers: number[]) {
    this.init();
    const promises = midiNumbers.map(async (midi) => {
      if (this.audioBuffers.has(midi)) return;
      const noteName = this.getNoteName(midi);
      // Using public MIDI.js soundfont repository
      const url = `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/${noteName}.mp3`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(midi, audioBuffer);
      } catch (e) {
        console.warn(`Failed to load sample for MIDI ${midi}, will use oscillator fallback.`, e);
      }
    });
    await Promise.all(promises);
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public playNote(midiNumber: number, duration: number = 1, forceOscillator: boolean = false) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const gainNode = this.ctx.createGain();
    
    // Connect to master and reverb
    gainNode.connect(this.masterGain);
    if (this.convolver) {
      gainNode.connect(this.convolver);
    }

    if (!forceOscillator && this.audioBuffers.has(midiNumber)) {
      // Play Piano Sample
      const source = this.ctx.createBufferSource();
      source.buffer = this.audioBuffers.get(midiNumber)!;
      source.connect(gainNode);
      
      // Natural piano decay envelope
      gainNode.gain.setValueAtTime(1, now);
      gainNode.gain.setTargetAtTime(0, now + duration, 0.15);
      
      source.start(now);
      source.stop(now + duration + 2); // Allow tail to ring out
    } else {
      // Fallback to Oscillator (or forced for UI sounds)
      if (!forceOscillator) {
        this.preload([midiNumber]); // Try to load for next time
      }
      
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = this.midiToFreq(midiNumber);
      osc.connect(gainNode);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      osc.start(now);
      osc.stop(now + duration);
    }
  }

  public async playReferenceA(): Promise<void> {
    this.playNote(69, 1.5); // A4
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  public async playMetronome(beats: number, bpm: number = 120): Promise<void> {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const beatDuration = 60 / bpm;
    for (let i = 0; i < beats; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.frequency.value = i === 0 ? 880 : 440; // High click on first beat
      osc.type = 'sine';
      
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.start(now);
      osc.stop(now + 0.1);
      
      await new Promise(resolve => setTimeout(resolve, beatDuration * 1000));
    }
  }

  public playChord(midiNumbers: number[], duration: number = 1) {
    midiNumbers.forEach(midi => this.playNote(midi, duration));
  }

  public async playSequence(midiNumbers: number[], durations: number[]): Promise<void> {
    this.init();
    if (!this.ctx) return;
    
    this.isPlayingSequence = true;
    
    // Base tempo: 1 duration = 500ms
    const baseMs = 500;
    
    for (let i = 0; i < midiNumbers.length; i++) {
      if (!this.isPlayingSequence) break;
      
      const midi = midiNumbers[i];
      const dur = durations[i] || 1;
      
      this.playNote(midi, dur * 0.8); // 0.8 to leave a small gap between notes
      
      await new Promise(resolve => setTimeout(resolve, dur * baseMs));
    }
    
    this.isPlayingSequence = false;
  }
  
  public stopSequence() {
    this.isPlayingSequence = false;
  }
}

export const audio = new AudioEngine();
