import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

<<<<<<< HEAD
const socket = io('https://video-call-backend-production-01ce.up.railway.app'); // ✅ Replace with your actual deployed backend
=======
const socket = io('https://video-call-backend-production-01ce.up.railway.app'); // Backend
>>>>>>> 6f327cffe869bc99428644136c3275c4fcece9c4

const VideoCall = () => {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerConnection = useRef(null);
  const [roomId] = useState('demo-room');
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [incomingCall, setIncomingCall] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(1); // include yourself by default

  useEffect(() => {
    // Get local video stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localVideo.current.srcObject = stream;

      // Join room
      socket.emit('join', roomId);

      // 🟢 New user joined
      socket.on('user-joined', (userId, totalUsers) => {
        setRemoteSocketId(userId);
        setIncomingCall(true);
        setConnectedUsers(totalUsers);
      });

      // 👥 Total connected users updated
      socket.on('update-user-count', (totalUsers) => {
        setConnectedUsers(totalUsers);
      });

      // 📞 Offer received
      socket.on('offer', async ({ offer, from }) => {
        setRemoteSocketId(from);
        peerConnection.current = createPeer(from);

        stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socket.emit('answer', { answer, to: from });
      });

      // 📞 Answer received
      socket.on('answer', async ({ answer }) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      });

      // ❄️ ICE candidate exchange
      socket.on('ice-candidate', ({ candidate }) => {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      });

      // ❌ User disconnected
      socket.on('user-left', (totalUsers) => {
        setConnectedUsers(totalUsers);
        remoteVideo.current.srcObject = null;
        if (peerConnection.current) {
          peerConnection.current.close();
          peerConnection.current = null;
        }
      });
    });
  }, []);

  // 👤 Create peer connection
  const createPeer = (targetId) => {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', { candidate: e.candidate, to: targetId });
      }
    };

    pc.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
    };

    return pc;
  };

  // 📞 Start outgoing call
  const startCall = async () => {
    const stream = localVideo.current.srcObject;
    peerConnection.current = createPeer(remoteSocketId);

    stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit('offer', { offer, to: remoteSocketId });
    setIncomingCall(false);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>🔴 Video Call Room</h2>
      <p>Room ID: <b>{roomId}</b></p>
      <p>👥 Users Connected: {connectedUsers}</p>

      {incomingCall && (
        <div style={{ backgroundColor: '#ffeeba', padding: '10px', marginBottom: '20px' }}>
          <p>📞 Someone is calling. Do you want to accept?</p>
          <button onClick={startCall} style={{ marginRight: '10px' }}>✅ Accept</button>
          <button onClick={() => setIncomingCall(false)}>❌ Reject</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <div>
          <h4>📷 You</h4>
          <video ref={localVideo} autoPlay muted playsInline style={{ width: '300px', borderRadius: '8px' }} />
        </div>
        <div>
          <h4>🎥 Remote</h4>
          <video ref={remoteVideo} autoPlay playsInline style={{ width: '300px', borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
