# Anomy Audio Game

An interactive musical creature raising and audio sequencing game rewritten in React + TypeScript + Vite.

## Features

- **演奏画面 (Play Screen)**:
  - Select songs loaded dynamically (`カエルの歌`, `こんぺいとうの踊り`, etc.).
  - Interactive musical stage with creature and instrument placement slots.
  - Drag-and-drop or click to place Anomy characters and instruments (clap, water sampler) into designated spots.
  - Filter bottom tray by character type (`anomy`, `instrument`, `all`).
  - Web Audio synthesis and playback powered by Tone.js and `@tonejs/midi`.
  - Automatic note scheduling and synchronized BGM playback.

- **育成画面 (Grow Screen)**:
  - Choose between Anomy characters (`アノミー1`, `アノミー2`).
  - Feed them different snacks to cultivate their acoustic stats:
    - やわらか餌 (Softness): Controls oscillator waveform (square -> triangle -> sine) and attack/release envelope.
    - ひびき餌 (Echo): Adjusts reverb decay and wetness.
    - あかるさ餌 (Brightness): Modulates lowpass filter frequency cutoff.
  - Interactive jump animation on feeding.
  - "今の音を確認する(デバッグ)": Audition the creature's generated synth voice in real time.
  - "能力リセット": Reset stats to default.
  - Persistent state in localStorage (`anomyStats_v3`).

## Tech Stack

- React 18
- TypeScript
- Vite
- Tone.js & @tonejs/midi
