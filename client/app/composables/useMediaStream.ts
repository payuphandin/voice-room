import { ref, shallowRef, onBeforeUnmount } from 'vue'

type MicrophoneStatus = 'idle' | 'requesting' | 'ready' | 'error'

export const useMediaStream = () => {
  const stream = shallowRef<MediaStream | null>(null)
  const status = ref<MicrophoneStatus>('idle')
  const errorMessage = ref('')
  const isMuted = ref(false)

  const enableMicrophone = async () => {
    if (stream.value) return

    if (!navigator.mediaDevices?.getUserMedia) {
      status.value = 'error'
      errorMessage.value = 'Browser นี้ไม่รองรับการเข้าถึงไมโครโฟน'
      return
    }

    status.value = 'requesting'
    errorMessage.value = ''

    try {
      stream.value = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })

      isMuted.value = false
      status.value = 'ready'
    } catch (error) {
      status.value = 'error'

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        errorMessage.value = 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน กรุณาอนุญาตใน Browser'
      } else if (error instanceof DOMException && error.name === 'NotFoundError') {
        errorMessage.value = 'ไม่พบไมโครโฟนที่ใช้งานได้'
      } else {
        errorMessage.value = 'เปิดไมโครโฟนไม่สำเร็จ กรุณาตรวจสอบอุปกรณ์และสิทธิ์การใช้งาน'
        console.error('getUserMedia error:', error)
      }
    }
  }

  // Mute by disabling the audio track. The WebRTC connection stays open.
  const toggleMute = () => {
    if (!stream.value) return

    isMuted.value = !isMuted.value

    stream.value.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted.value
    })
  }

  const stopMicrophone = () => {
    stream.value?.getTracks().forEach((track) => track.stop())
    stream.value = null
    status.value = 'idle'
    isMuted.value = false
    errorMessage.value = ''
  }

  onBeforeUnmount(() => {
    stopMicrophone()
  })

  return {
    stream,
    status,
    errorMessage,
    isMuted,
    enableMicrophone,
    toggleMute,
    stopMicrophone
  }
}
