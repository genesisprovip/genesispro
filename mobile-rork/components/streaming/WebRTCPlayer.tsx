/**
 * WebRTC Player via WebView — uses OvenMediaEngine's WebRTC signaling.
 * Works in Expo Go without native modules.
 * Provides sub-second latency vs 6-15s with HLS.
 */
import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface WebRTCPlayerProps {
  signalingUrl: string;
  streamName: string;
  onReady?: () => void;
  onError?: () => void;
  style?: object;
}

export default function WebRTCPlayer({
  signalingUrl,
  streamName,
  onReady,
  onError,
  style,
}: WebRTCPlayerProps) {
  const webViewRef = useRef<WebView>(null);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') onReady?.();
      if (data.type === 'error') onError?.();
    } catch {}
  }, [onReady, onError]);

  // Inline HTML that connects via WebRTC to OME
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
    video { width: 100%; height: 100%; object-fit: contain; background: #000; }
    .connecting { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      color: #fff; font-family: sans-serif; font-size: 14px; }
  </style>
</head>
<body>
  <video id="player" autoplay playsinline muted></video>
  <div class="connecting" id="status">Conectando WebRTC...</div>
  <script>
    const SIGNALING_URL = '${signalingUrl}';
    const STREAM_NAME = '${streamName}';
    const video = document.getElementById('player');
    const status = document.getElementById('status');

    let pc = null;
    let ws = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    function sendToApp(type, data) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
    }

    function connect() {
      try {
        // WebSocket to OME signaling
        const wsUrl = SIGNALING_URL.replace('wss://', 'wss://').replace('ws://', 'ws://');
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          // Request offer from OME for this stream
          ws.send(JSON.stringify({
            command: 'request_offer',
            id: Date.now(),
            type: 'live',
            stream: { name: STREAM_NAME, type: 'webrtc' }
          }));
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);

          if (msg.command === 'offer') {
            // Create peer connection
            pc = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                ...(msg.ice_servers || [])
              ],
              bundlePolicy: 'max-bundle',
              rtcpMuxPolicy: 'require'
            });

            pc.ontrack = (e) => {
              if (e.streams && e.streams[0]) {
                video.srcObject = e.streams[0];
                video.play().catch(() => {});
                status.style.display = 'none';
                sendToApp('ready');
              }
            };

            pc.onicecandidate = (e) => {
              if (e.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  command: 'candidate',
                  id: msg.id,
                  candidates: [{ candidate: e.candidate.candidate, sdpMLineIndex: e.candidate.sdpMLineIndex }]
                }));
              }
            };

            pc.onconnectionstatechange = () => {
              if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                cleanup();
                retry();
              }
            };

            // Set remote description (OME's offer)
            const sdp = new RTCSessionDescription({ type: 'offer', sdp: msg.sdp });
            await pc.setRemoteDescription(sdp);

            // Create and send answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            ws.send(JSON.stringify({
              command: 'answer',
              id: msg.id,
              sdp: answer.sdp
            }));

          } else if (msg.command === 'candidate' && pc) {
            // Add ICE candidates from OME
            if (msg.candidates) {
              for (const c of msg.candidates) {
                await pc.addIceCandidate(new RTCIceCandidate({
                  candidate: c.candidate,
                  sdpMLineIndex: c.sdpMLineIndex
                }));
              }
            }
          } else if (msg.code && msg.code !== 200) {
            // OME returned an error
            sendToApp('error', { code: msg.code, message: msg.message });
            retry();
          }
        };

        ws.onerror = () => { retry(); };
        ws.onclose = () => { /* handled by retry if needed */ };

      } catch (err) {
        sendToApp('error', { message: err.message });
        retry();
      }
    }

    function cleanup() {
      if (pc) { try { pc.close(); } catch {} pc = null; }
      if (ws) { try { ws.close(); } catch {} ws = null; }
    }

    function retry() {
      cleanup();
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        status.textContent = 'Reconectando... (' + retryCount + '/' + MAX_RETRIES + ')';
        status.style.display = 'block';
        setTimeout(connect, 2000);
      } else {
        status.textContent = 'No se pudo conectar';
        sendToApp('error', { message: 'Max retries reached' });
      }
    }

    // Unmute on first touch
    document.addEventListener('touchstart', () => {
      video.muted = false;
    }, { once: true });

    connect();
  </script>
</body>
</html>`;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        originWhitelist={['*']}
        allowsFullscreenVideo
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
