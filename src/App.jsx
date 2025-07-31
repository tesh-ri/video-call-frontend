import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://video-call-backend-production-01ce.up.railway.app'); // Backend

const VideoCall = () => {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerConnection = useRef(null);
  const [roomId] = useState('demo-room'); // static room

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localVideo.current.srcObject = stream;

      socket.emit('join', roomId);

      socket.on('user-joined', async (userId) => {
        peerConnection.current = createPeer();
        stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        socket.emit('offer', { offer, to: userId });
      });

      socket.on('offer', async ({ offer, from }) => {
        peerConnection.current = createPeer();

        stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socket.emit('answer', { answer, to: from });
      });

      socket.on('answer', async ({ answer }) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('ice-candidate', ({ candidate }) => {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      });
    });
  }, []);

  const createPeer = () => {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', { candidate: e.candidate, to: 'peerId' }); // You need to track `to`
      }
    };

    pc.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
    };

    return pc;
  };

  return (
    <div>
      <h2>Video Call</h2>
      <video ref={localVideo} autoPlay muted style={{ width: '45%' }} />
      <video ref={remoteVideo} autoPlay style={{ width: '45%' }} />
    </div>
  );
};

export default VideoCall;
