// src/ui/SoundManager.ts
export enum SoundType {
    CARD_DRAW = 'cardDraw',
    CARD_PLAY = 'cardPlay',
    UNIT_SPAWN = 'unitSpawn',
    UNIT_ATTACK = 'unitAttack',
    UNIT_DEATH = 'unitDeath',
    DAMAGE = 'damage',
    HEAL = 'heal',
    TURN_START = 'turnStart',
    VICTORY = 'victory',
    DEFEAT = 'defeat',
    BUTTON_CLICK = 'buttonClick',
    BUTTON_HOVER = 'buttonHover',
    PHASE_CHANGE = 'PHASE_CHANGE'
  }
  
  export class SoundManager {
    private static instance: SoundManager;
    private audioContext: AudioContext | null = null;
    private sounds: Map<string, AudioBuffer> = new Map();
    private masterVolume: number = 0.5;
    private sfxVolume: number = 0.5;
    private musicVolume: number = 0.3;
    private enabled: boolean = true;
  
    private constructor() {
      this.initializeAudioContext();
      this.generateSounds();
    }
  
    public static getInstance(): SoundManager {
      if (!SoundManager.instance) {
        SoundManager.instance = new SoundManager();
      }
      return SoundManager.instance;
    }
  
    private initializeAudioContext(): void {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported');
      }
    }
  
    private generateSounds(): void {
      if (!this.audioContext) return;
  
      // Generate synthetic sounds for each type
      this.sounds.set(SoundType.CARD_DRAW, this.createCardDrawSound());
      this.sounds.set(SoundType.CARD_PLAY, this.createCardPlaySound());
      this.sounds.set(SoundType.UNIT_SPAWN, this.createUnitSpawnSound());
      this.sounds.set(SoundType.UNIT_ATTACK, this.createUnitAttackSound());
      this.sounds.set(SoundType.UNIT_DEATH, this.createUnitDeathSound());
      this.sounds.set(SoundType.DAMAGE, this.createDamageSound());
      this.sounds.set(SoundType.HEAL, this.createHealSound());
      this.sounds.set(SoundType.TURN_START, this.createTurnStartSound());
      this.sounds.set(SoundType.BUTTON_CLICK, this.createButtonClickSound());
      this.sounds.set(SoundType.BUTTON_HOVER, this.createButtonHoverSound());
    }
  
    private createCardDrawSound(): AudioBuffer {
      return this.createSynthSound(0.1, (t, i) => {
        const frequency = 800 + Math.sin(t * 20) * 200;
        return Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 10);
      });
    }
  
    private createCardPlaySound(): AudioBuffer {
      return this.createSynthSound(0.2, (t, i) => {
        const frequency = 440 + t * 1000;
        return Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 5);
      });
    }
  
    private createUnitSpawnSound(): AudioBuffer {
      return this.createSynthSound(0.3, (t, i) => {
        const frequency = 220 * (1 + t * 2);
        const envelope = Math.exp(-t * 3);
        return (Math.sin(2 * Math.PI * frequency * t) + 
                Math.sin(2 * Math.PI * frequency * 2 * t) * 0.5) * envelope;
      });
    }
  
    private createUnitAttackSound(): AudioBuffer {
      return this.createSynthSound(0.2, (t, i) => {
        const noise = (Math.random() - 0.5) * 0.3;
        const frequency = 150;
        const envelope = t < 0.05 ? t * 20 : Math.exp(-(t - 0.05) * 10);
        return (Math.sin(2 * Math.PI * frequency * t) + noise) * envelope;
      });
    }
  
    private createUnitDeathSound(): AudioBuffer {
      return this.createSynthSound(0.4, (t, i) => {
        const frequency = 200 * Math.exp(-t * 2);
        const noise = (Math.random() - 0.5) * 0.2;
        return (Math.sin(2 * Math.PI * frequency * t) + noise) * Math.exp(-t * 5);
      });
    }
  
    private createDamageSound(): AudioBuffer {
      return this.createSynthSound(0.15, (t, i) => {
        const frequency = 100;
        const noise = (Math.random() - 0.5) * 0.5;
        const envelope = t < 0.02 ? t * 50 : Math.exp(-(t - 0.02) * 15);
        return (Math.sin(2 * Math.PI * frequency * t) * 0.5 + noise) * envelope;
      });
    }
  
    private createHealSound(): AudioBuffer {
      return this.createSynthSound(0.3, (t, i) => {
        const frequency = 523.25 + Math.sin(t * 10) * 50; // C5 with vibrato
        const envelope = Math.sin(Math.PI * t / 0.3);
        return Math.sin(2 * Math.PI * frequency * t) * envelope * 0.5;
      });
    }
  
    private createTurnStartSound(): AudioBuffer {
      return this.createSynthSound(0.5, (t, i) => {
        const freq1 = 440; // A4
        const freq2 = 554.37; // C#5
        const freq3 = 659.25; // E5
        
        let frequency;
        if (t < 0.15) frequency = freq1;
        else if (t < 0.3) frequency = freq2;
        else frequency = freq3;
        
        const envelope = Math.exp(-t * 2);
        return Math.sin(2 * Math.PI * frequency * t) * envelope;
      });
    }
  
    private createButtonClickSound(): AudioBuffer {
      return this.createSynthSound(0.05, (t, i) => {
        const frequency = 1000;
        return Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 50);
      });
    }
  
    private createButtonHoverSound(): AudioBuffer {
      return this.createSynthSound(0.03, (t, i) => {
        const frequency = 1500;
        return Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 100) * 0.3;
      });
    }
  
    private createSynthSound(duration: number, generator: (t: number, i: number) => number): AudioBuffer {
      if (!this.audioContext) return null as any;
      
      const sampleRate = this.audioContext.sampleRate;
      const length = duration * sampleRate;
      const buffer = this.audioContext.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        data[i] = generator(t, i);
      }
      
      return buffer;
    }
  
    public play(soundType: SoundType, volume: number = 1): void {
      if (!this.enabled || !this.audioContext) return;
      
      const buffer = this.sounds.get(soundType);
      if (!buffer) return;
      
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      gainNode.gain.value = this.masterVolume * this.sfxVolume * volume;
      
      source.start(0);
    }
  
    public setMasterVolume(volume: number): void {
      this.masterVolume = Math.max(0, Math.min(1, volume));
    }
  
    public setSfxVolume(volume: number): void {
      this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
  
    public setMusicVolume(volume: number): void {
      this.musicVolume = Math.max(0, Math.min(1, volume));
    }
  
    public setEnabled(enabled: boolean): void {
      this.enabled = enabled;
    }
  
    public isEnabled(): boolean {
      return this.enabled;
    }
  }