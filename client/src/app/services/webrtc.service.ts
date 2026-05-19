import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { SocketService } from './socket.service';
import { GameService } from './game.service';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

@Injectable({
  providedIn: 'root',
})
export class WebrtcService implements OnDestroy {
  private socketService = inject(SocketService);
  private gameService = inject(GameService);

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemote = false;

  private localStreamSubject = new Subject<MediaStream>();
  private remoteStreamSubject = new Subject<MediaStream>();
  private connectionErrorSubject = new Subject<string>();

  localStream$ = this.localStreamSubject.asObservable();
  remoteStream$ = this.remoteStreamSubject.asObservable();
  connectionError$ = this.connectionErrorSubject.asObservable();

  private roomId: string | null = null;

  async init(roomId: string): Promise<void> {
    this.roomId = roomId;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      this.localStreamSubject.next(this.localStream);
    } catch (err) {
      this.connectionErrorSubject.next('Failed to access camera');
      return;
    }

    this.createPeerConnection();
    this.listenForSignals();
  }

  private createPeerConnection(): void {
    this.pc = new RTCPeerConnection(ICE_SERVERS);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }
    }

    this.pc.onicecandidate = (event) => {
      if (!event.candidate || !this.roomId) return;
      this.socketService.emit('webrtc_ice_candidate', {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        roomId: this.roomId,
      });
    };

    this.pc.ontrack = (event) => {
      if (event.streams[0]) {
        this.remoteStreamSubject.next(event.streams[0]);
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'failed') {
        this.connectionErrorSubject.next('WebRTC connection failed');
      }
    };
  }

  private listenForSignals(): void {
    this.socketService.on('webrtc_offer').subscribe(async (data: any) => {
      try {
        await this.handleOffer(data);
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    this.socketService.on('webrtc_answer').subscribe(async (data: any) => {
      try {
        await this.handleAnswer(data);
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    this.socketService.on('webrtc_ice_candidate').subscribe(async (data: any) => {
      try {
        await this.handleIceCandidate(data);
      } catch (err) {
        console.error('Error handling ICE candidate:', err);
      }
    });
  }

  private async handleOffer(data: { sdp: string; type: string; targetSocketId: string }): Promise<void> {
    if (!this.pc) return;
    const offerCollision = data.type === 'offer' && (this.makingOffer || this.pc.signalingState !== 'stable');
    this.ignoreOffer = !this.isSettingRemote && offerCollision;
    if (this.ignoreOffer) return;
    this.isSettingRemote = true;
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
    this.isSettingRemote = false;
    if (data.type === 'offer') {
      await this.pc.setLocalDescription();
      if (this.roomId) {
        this.socketService.emit('webrtc_answer', {
          sdp: this.pc.localDescription?.sdp || '',
          roomId: this.roomId,
        });
      }
    }
  }

  private async handleAnswer(data: { sdp: string; type: string; targetSocketId: string }): Promise<void> {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
  }

  private async handleIceCandidate(data: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null; targetSocketId: string }): Promise<void> {
    if (!this.pc) return;
    if (!data.candidate) {
      await this.pc.addIceCandidate(null);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate({
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMLineIndex: data.sdpMLineIndex,
      }));
    } catch (err) {
      if (!this.ignoreOffer) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  }

  async makeOffer(): Promise<void> {
    if (!this.pc || !this.roomId) return;
    this.makingOffer = true;
    try {
      await this.pc.setLocalDescription();
      if (this.pc.localDescription) {
        this.socketService.emit('webrtc_offer', {
          sdp: this.pc.localDescription.sdp,
          roomId: this.roomId,
        });
      }
    } catch (err) {
      console.error('Error making offer:', err);
    } finally {
      this.makingOffer = false;
    }
  }

  cleanup(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
    this.roomId = null;
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
