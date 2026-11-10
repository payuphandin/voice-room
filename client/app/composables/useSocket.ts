import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { io, type Socket } from 'socket.io-client'

type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'

export const useSocket = () => {
  const config = useRuntimeConfig()
  const socket = shallowRef<Socket | null>(null)
  const status = ref<ConnectionStatus>('connecting')
  const memberCount = ref(0)
  const roomError = ref('')
  const isInitiator = ref(false)

  onMounted(() => {
    const client = io(config.public.socketUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    socket.value = client

    client.on('connect', () => {
      status.value = 'connected'
      roomError.value = ''
      client.emit('room:join')
    })

    client.on('disconnect', () => {
      status.value = 'disconnected'
      memberCount.value = 0
      isInitiator.value = false
    })

    client.on('connect_error', (error) => {
      status.value = 'disconnected'
      console.error('Socket connection error:', error.message)
    })

    client.on('room:joined', (data: {
      members: number
      isInitiator: boolean
    }) => {
      memberCount.value = data.members
      isInitiator.value = data.isInitiator
    })

    client.on('room:peer-joined', (data: { members: number }) => {
      memberCount.value = data.members
    })

    client.on('room:peer-left', (data: {
      members: number
      isInitiator: boolean
    }) => {
      memberCount.value = data.members
      isInitiator.value = data.isInitiator
    })

    client.on('room:error', (data: { message: string }) => {
      roomError.value = data.message
      memberCount.value = 0
      isInitiator.value = false
    })
  })

  onBeforeUnmount(() => {
    socket.value?.disconnect()
    socket.value = null
  })

  return {
    socket,
    status,
    memberCount,
    roomError,
    isInitiator
  }
}
