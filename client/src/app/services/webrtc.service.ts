import { Injectable, inject } from '@angular/core';
import { SocketService } from './socket.service';
import { MediaPipeService } from './mediapipe.service';

@Injectable({ providedIn: 'root' })
export class WebRTCService {
    private socketService = inject(SocketService);
    private mediaPipeService = inject(MediaPipeService);
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private roomId: string | null = null;
    private initialized = false;

    private readonly iceServers = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    async init(roomId: string, remoteVideo: HTMLVideoElement, isInitiator: boolean) {
        if (this.initialized) return;
        this.initialized = true;
        this.roomId = roomId;
        this.peerConnection = new RTCPeerConnection(this.iceServers);

        // Reutilizar el stream del gesture-detector
        this.localStream = this.mediaPipeService.getVideoStream();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection!.addTrack(track, this.localStream!);
            });
        }

        this.peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.roomId) {
                this.socketService.emit('webrtc_ice_candidate', {
                    roomId: this.roomId,
                    candidate: event.candidate
                });
            }
        };

        this.socketService.on('webrtc_offer').subscribe(async (data) => {
            if (this.peerConnection!.signalingState !== 'stable') return;
            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);
            this.socketService.emit('webrtc_answer', { roomId: this.roomId!, answer });
        });

        this.socketService.on('webrtc_answer').subscribe(async (data) => {
            if (this.peerConnection!.signalingState !== 'have-local-offer') return;
            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(data.answer));
        });

        this.socketService.on('webrtc_ice_candidate').subscribe(async (data) => {
            if (data.candidate) {
                await this.peerConnection!.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });

        if (isInitiator) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // ← 2000 en vez de 1000
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.socketService.emit('webrtc_offer', { roomId: this.roomId!, offer });
        }
    }

    stop() {
        this.peerConnection?.close();
        this.peerConnection = null;
        this.localStream = null;
        this.initialized = false;
    }
}