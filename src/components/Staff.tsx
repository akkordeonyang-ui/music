import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Accidental, Dot, Formatter } from 'vexflow';

interface StaffProps {
  midiNotes: number[];
  durations?: number[];
  type: string;
}

export default function Staff({ midiNotes, durations, type }: StaffProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(320, 150);
    const context = renderer.getContext();
    
    const stave = new Stave(10, 20, 300);
    stave.addClef('treble');
    stave.setContext(context).draw();

    const getVexKey = (midi: number) => {
      const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
      const name = noteNames[midi % 12];
      const octave = Math.floor(midi / 12) - 1;
      return `${name}/${octave}`;
    };

    let notes: StaveNote[] = [];

    if (type === 'chord' || type === 'seventh_chord' || type === 'interval') {
      const keys = midiNotes.map(getVexKey);
      const staveNote = new StaveNote({ keys, duration: 'w' });
      
      midiNotes.forEach((midi, index) => {
        const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
        const name = noteNames[midi % 12];
        if (name.includes('#')) {
          staveNote.addModifier(new Accidental('#'), index);
        }
      });
      
      notes = [staveNote];
    } else {
      notes = midiNotes.map((midi, i) => {
        const key = getVexKey(midi);
        let dur = 'q';
        if (durations && durations[i]) {
          if (durations[i] === 1) dur = 'q';
          else if (durations[i] === 0.5) dur = '8';
          else if (durations[i] === 0.25) dur = '16';
          else if (durations[i] === 0.33) dur = '8'; // triplet approx
          else if (durations[i] === 0.75) dur = '8d';
        } else {
          dur = 'w';
        }
        
        const staveNote = new StaveNote({ keys: [key], duration: dur });
        
        const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
        const name = noteNames[midi % 12];
        if (name.includes('#')) {
          staveNote.addModifier(new Accidental('#'), 0);
        }
        if (dur.includes('d')) {
          staveNote.addModifier(new Dot(), 0);
        }
        
        return staveNote;
      });
    }

    Formatter.FormatAndDraw(context, stave, notes);

  }, [midiNotes, durations, type]);

  return <div ref={containerRef} className="flex justify-center bg-white rounded-xl p-2" />;
}
