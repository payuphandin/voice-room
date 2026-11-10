import {
  ref,
  shallowRef,
  watch,
  onBeforeUnmount,
  type Ref,
  type ShallowRef
} from 'vue'
import type { Socket } from 'socket.io-client'

export const useWebRTC = (
  socketRef: ShallowRef<Socket | null>,
  localStreamRef: ShallowRef<MediaStream | null>,
  memberCountRef: Ref<number>,
  isInitiatorRef: Ref<boolean>
) => {
  const remoteStream = shallowRef<MediaStream | null>(null)
  const connectionState = ref<RTCPeerConnectionState | 'idle'>('idle')
  const errorMessage = ref('')

  let activeSocket: Socket | null = null
  let peerConnection: RTCPeerConnection | null = null
  let pendingOffer: RTCSessionDescriptionInit | null = null
  const pendingCandidates: RTCIceCandidateInit[] = []

  let makingOffer = false
  let makingAnswer = false

  const closePeerConnection = () => {
    const currentPeer = peerConnection
    peerConnection = null

    currentPeer?.close()

    remoteStream.value = null
    connectionState.value = 'idle'
    pendingOffer = null
    pendingCandidates.length = 0
    makingOffer = false
    makingAnswer = false
  }

  const createPeerConnection = () => {
    if (peerConnection) return peerConnection

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    })

    peerConnection = pc

    // Add local microphone tracks to this peer connection.
    const localStream = localStreamRef.value

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && activeSocket?.connected) {
        activeSocket.emit(
          'webrtc:ice-candidate',
          event.candidate.toJSON()
        )
      }
    }

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        remoteStream.value = event.streams[0]
      } else {
        const receivedStream = remoteStream.value ?? new MediaStream()
        receivedStream.addTrack(event.track)
        remoteStream.value = receivedStream
      }
    }

    pc.onconnectionstatechange = () => {
      if (peerConnection !== pc) return

      connectionState.value = pc.connectionState

      if (pc.connectionState === 'failed') {
        errorMessage.value = 'เชื่อมต่อเสียงไม่สำเร็จ อาจต้องใช้ TURN Server'
      }
    }

    return pc
  }

  const flushPendingCandidates = async (pc: RTCPeerConnection) => {
    while (pendingCandidates.length > 0) {
      const candidate = pendingCandidates.shift()

      if (candidate) {
        await pc.addIceCandidate(candidate)
      }
    }
  }

  const createOffer = async () => {
    if (
      !activeSocket?.connected ||
      !isInitiatorRef.value ||
      memberCountRef.value !== 2 ||
      !localStreamRef.value ||
      peerConnection ||
      makingOffer
    ) {
      return
    }

    makingOffer = true
    errorMessage.value = ''

    try {
      const pc = createPeerConnection()
      const offer = await pc.createOffer()

      await pc.setLocalDescription(offer)

      if (activeSocket.connected) {
        activeSocket.emit(
          'webrtc:offer',
          pc.localDescription?.toJSON()
        )
      }
    } catch (error) {
      console.error('Create offer failed:', error)
      errorMessage.value = 'สร้างการเชื่อมต่อเสียงไม่สำเร็จ'
      closePeerConnection()
    } finally {
      makingOffer = false
    }
  }

  const createAnswer = async () => {
    if (
      !pendingOffer ||
      !localStreamRef.value ||
      !activeSocket?.connected ||
      makingAnswer
    ) {
      return
    }

    makingAnswer = true
    const offer = pendingOffer
    pendingOffer = null
    errorMessage.value = ''

    try {
      const pc = createPeerConnection()

      await pc.setRemoteDescription(offer)
      await flushPendingCandidates(pc)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      if (activeSocket.connected) {
        activeSocket.emit(
          'webrtc:answer',
          pc.localDescription?.toJSON()
        )
      }
    } catch (error) {
      console.error('Create answer failed:', error)
      errorMessage.value = 'ตอบรับการเชื่อมต่อเสียงไม่สำเร็จ'
      closePeerConnection()
    } finally {
      makingAnswer = false
    }
  }

  const handleOffer = (offer: RTCSessionDescriptionInit) => {
    // The server relays offers only between members of this room.
    // Keep an early offer until the room and microphone state are ready.
    pendingOffer = offer
    void createAnswer()
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection) return

    try {
      await peerConnection.setRemoteDescription(answer)
      await flushPendingCandidates(peerConnection)
    } catch (error) {
      console.error('Set remote answer failed:', error)
      errorMessage.value = 'รับคำตอบการเชื่อมต่อไม่สำเร็จ'
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnection?.remoteDescription) {
        await peerConnection.addIceCandidate(candidate)
      } else {
        pendingCandidates.push(candidate)
      }
    } catch (error) {
      console.error('Add ICE candidate failed:', error)
    }
  }

  const handleSocketDisconnect = () => {
    closePeerConnection()
  }

  // Listen for signaling events on the current Socket.IO connection.
  watch(
    socketRef,
    (nextSocket, previousSocket) => {
      if (previousSocket) {
        previousSocket.off('webrtc:offer', handleOffer)
        previousSocket.off('webrtc:answer', handleAnswer)
        previousSocket.off('webrtc:ice-candidate', handleIceCandidate)
        previousSocket.off('disconnect', handleSocketDisconnect)
      }

      closePeerConnection()
      activeSocket = nextSocket

      if (nextSocket) {
        nextSocket.on('webrtc:offer', handleOffer)
        nextSocket.on('webrtc:answer', handleAnswer)
        nextSocket.on('webrtc:ice-candidate', handleIceCandidate)
        nextSocket.on('disconnect', handleSocketDisconnect)
      }
    },
    { immediate: true }
  )

  // Start the offer only from the first member. The answerer waits for an offer.
  watch(
    () => [
      localStreamRef.value,
      memberCountRef.value,
      isInitiatorRef.value,
      activeSocket?.connected
    ] as const,
    () => {
      if (memberCountRef.value !== 2) {
        closePeerConnection()
        return
      }

      if (!localStreamRef.value || !activeSocket?.connected) return

      if (pendingOffer) {
        void createAnswer()
      } else if (isInitiatorRef.value) {
        void createOffer()
      }
    },
    { flush: 'post' }
  )

  onBeforeUnmount(() => {
    if (activeSocket) {
      activeSocket.off('webrtc:offer', handleOffer)
      activeSocket.off('webrtc:answer', handleAnswer)
      activeSocket.off('webrtc:ice-candidate', handleIceCandidate)
      activeSocket.off('disconnect', handleSocketDisconnect)
    }

    closePeerConnection()
  })

  return {
    remoteStream,
    connectionState,
    errorMessage
  }
}
