<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSocket } from '../composables/useSocket'
import { useMediaStream } from '../composables/useMediaStream'
import { useWebRTC } from '../composables/useWebRTC'

const {
  socket,
  status: socketStatus,
  memberCount,
  roomError,
  isInitiator
} = useSocket()

const {
  stream,
  status: micStatus,
  errorMessage: micError,
  isMuted,
  enableMicrophone,
  toggleMute
} = useMediaStream()

const {
  remoteStream,
  connectionState,
  errorMessage: webrtcError
} = useWebRTC(socket, stream, memberCount, isInitiator)

const remoteAudio = ref<HTMLAudioElement | null>(null)

watch(
  [remoteStream, remoteAudio],
  ([incomingStream, audioElement]) => {
    if (audioElement) {
      audioElement.srcObject = incomingStream
    }
  },
  { flush: 'post' }
)
</script>

<template>
  <main>
    <h1>Minimal Voice Room</h1>

    <section>
      <h2>Room</h2>
      <p>Socket: {{ socketStatus }}</p>
      <p>Members: {{ memberCount }}/2</p>

      <p v-if="socketStatus === 'connected' && memberCount === 1">
        Waiting for another member...
      </p>

      <p v-if="memberCount === 2">
        Both members are here!
      </p>

      <p v-if="roomError">
        {{ roomError }}
      </p>
    </section>

    <section>
      <h2>Microphone</h2>
      <p>Status: {{ micStatus }}</p>

      <button
        v-if="micStatus !== 'ready'"
        :disabled="micStatus === 'requesting'"
        @click="enableMicrophone"
      >
        {{ micStatus === 'requesting' ? 'Opening microphone...' : 'Enable microphone' }}
      </button>

      <button
        v-else
        @click="toggleMute"
      >
        {{ isMuted ? 'Unmute microphone' : 'Mute microphone' }}
      </button>

      <p v-if="micStatus === 'ready'">
        {{ isMuted ? 'Microphone is muted.' : 'Microphone is ready.' }}
      </p>

      <p v-if="micError">
        {{ micError }}
      </p>
    </section>

    <section>
      <h2>Voice Connection</h2>
      <p>WebRTC: {{ connectionState }}</p>

      <p v-if="connectionState === 'connected'">
        Voice connection established!
      </p>

      <p v-else-if="memberCount !== 2">
        Waiting for both members...
      </p>

      <p v-else-if="micStatus !== 'ready'">
        Enable your microphone to start the voice connection.
      </p>

      <p v-else>
        Connecting to the other member...
      </p>

      <audio
        v-if="remoteStream"
        ref="remoteAudio"
        autoplay
        controls
        playsinline
      />

      <p v-if="remoteStream">
        Incoming audio is available. Use the audio controls if playback does not start.
      </p>

      <p v-if="webrtcError">
        {{ webrtcError }}
      </p>
    </section>
  </main>
</template>
