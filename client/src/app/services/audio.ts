import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private music: HTMLAudioElement | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private muted = false;
  private musicVolume = 0.2;
  private startHandler: (() => void) | null = null;

  preload(key: string, src: string) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    this.sounds.set(key, audio);
  }

  playMusic(src: string, volume: number) {
    if (this.music && !this.music.paused && this.music.src.endsWith(src)) return;
    this.stopMusic();
    this.musicVolume = volume;

    if (this.music !== null || document.hasFocus()) {
      this.music = new Audio(src);
      this.music.loop = true;
      this.music.volume = this.musicVolume;
      this.music.muted = this.muted;
      this.music.play().catch(() => {
        this.waitForInteraction(src);
      });
      return;
    }

    this.waitForInteraction(src);
  }

  setVolume(volume: number) {
    this.musicVolume = volume;
    if (this.music) this.music.volume = volume;
  }

  private waitForInteraction(src: string) {
    this.removeStartHandler();

    this.startHandler = () => {
      this.removeStartHandler();
      this.music = new Audio(src);
      this.music.loop = true;
      this.music.volume = this.musicVolume;
      this.music.muted = this.muted;
      this.music.play().catch(err => console.warn('Audio bloqueado:', err));
    };

    document.addEventListener('click', this.startHandler);
    document.addEventListener('keydown', this.startHandler);
    document.addEventListener('touchstart', this.startHandler);
  }

  private removeStartHandler() {
    if (this.startHandler) {
      document.removeEventListener('click', this.startHandler);
      document.removeEventListener('keydown', this.startHandler);
      document.removeEventListener('touchstart', this.startHandler);
      this.startHandler = null;
    }
  }

  stopMusic() {
    this.removeStartHandler();
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
      this.music = null;
    }
  }

  play(key: string, volume?: number) {
    const sound = this.sounds.get(key);
    if (sound && !this.muted) {
      sound.currentTime = 0;
      if (volume !== undefined) sound.volume = volume;
      sound.play().catch(() => {});
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.music) this.music.muted = this.muted;
    this.sounds.forEach(s => s.muted = this.muted);
    return this.muted;
  }
}