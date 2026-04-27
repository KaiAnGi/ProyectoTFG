import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private music: HTMLAudioElement | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private muted = false;
  private musicSrc = '';
  private musicVolume = 0.2;
  private musicReady = false;

  preload(key: string, src: string) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    this.sounds.set(key, audio);
  }

  playMusic(src: string, volume: number) {
    this.musicSrc = src;
    this.musicVolume = volume;

    // NO llamar play() aquí — esperar interacción
    const start = () => {
      if (this.musicReady) return;
      this.musicReady = true;

      this.music = new Audio(this.musicSrc);
      this.music.loop = true;
      this.music.volume = this.musicVolume;
      this.music.muted = this.muted;
      this.music.play().catch(err => console.warn('Audio bloqueado:', err));

      document.removeEventListener('click', start);
      document.removeEventListener('keydown', start);
      document.removeEventListener('touchstart', start);
    };

    document.addEventListener('click', start);
    document.addEventListener('keydown', start);
    document.addEventListener('touchstart', start);
  }

  play(key: string, volume?: number) {
    const sound = this.sounds.get(key);
    if (sound && !this.muted) {
      sound.currentTime = 0;
      if (volume !== undefined) sound.volume = volume;
      sound.play().catch(() => { });
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.music) this.music.muted = this.muted;
    this.sounds.forEach(s => s.muted = this.muted);
    return this.muted;
  }
}