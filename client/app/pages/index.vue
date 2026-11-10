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
  <main class="page-shell">
    <div class="page-frame">
      <header class="topbar">
        <NuxtLink to="/" class="brand" aria-label="หน้าห้องเสียง">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 28 28" fill="none">
              <path d="M14 4.5v19M9.5 8v12M18.5 8v12M5 11v6M23 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </span>
          <span>ห้องเสียง</span>
        </NuxtLink>

        <div class="server-status" :class="{ 'is-online': socketStatus === 'connected' }">
          <span class="status-dot" />
          <span>{{ socketStatus === 'connected' ? 'เชื่อมต่อเซิร์ฟเวอร์แล้ว' : socketStatus === 'connecting' ? 'กำลังเชื่อมต่อ' : 'ขาดการเชื่อมต่อ' }}</span>
        </div>
      </header>

      <section class="page-heading">
        <div>
          <p class="eyebrow">ห้องสนทนา</p>
          <h1>คุยกันได้เลย</h1>
          <p class="page-description">ห้องนี้รองรับ 2 คน เปิดไมโครโฟนเพื่อเริ่มสนทนา</p>
        </div>
        <div class="room-number" aria-label="ห้องรองรับ 2 คน">
          <span class="room-number-label">สมาชิก</span>
          <span class="room-number-value">{{ memberCount }}<span> / 2</span></span>
        </div>
      </section>

      <section class="room-section" aria-labelledby="members-title">
        <div class="section-heading">
          <h2 id="members-title">คนในห้อง</h2>
          <span class="section-note">{{ memberCount === 2 ? 'เข้าครบแล้ว' : 'รอสมาชิกอีกคน' }}</span>
        </div>

        <div
          class="room-progress"
          role="progressbar"
          :aria-valuenow="memberCount"
          aria-valuemin="0"
          aria-valuemax="2"
          aria-label="จำนวนสมาชิกในห้อง"
        >
          <span :style="{ width: (Math.min(memberCount, 2) * 50) + '%' }" />
        </div>

        <div class="member-list">
          <div class="member-row">
            <div class="member-avatar avatar-self">คุณ</div>
            <div class="member-details">
              <span class="member-name">คุณ</span>
              <span class="member-state">
                {{ memberCount > 0 ? 'อยู่ในห้องแล้ว' : socketStatus === 'connected' ? 'กำลังเข้าห้อง' : 'ยังไม่เชื่อมต่อ' }}
              </span>
            </div>
            <span class="presence-dot" :class="{ 'is-present': memberCount > 0 }" />
          </div>

          <div class="member-row">
            <div class="member-avatar avatar-other">02</div>
            <div class="member-details">
              <span class="member-name">อีกคน</span>
              <span class="member-state">{{ memberCount === 2 ? 'อยู่ในห้องแล้ว' : 'ยังไม่เข้าห้อง' }}</span>
            </div>
            <span class="presence-dot" :class="{ 'is-present': memberCount === 2 }" />
          </div>
        </div>

        <p class="room-hint">
          {{ memberCount === 2 ? 'ตอนนี้มีสมาชิกครบแล้ว' : 'เมื่ออีกคนเข้ามา สถานะจะเปลี่ยนเป็นพร้อมสนทนา' }}
        </p>
      </section>

      <div class="section-heading controls-heading">
        <h2>การตั้งค่าเสียง</h2>
        <span class="section-note">ไมโครโฟนและเสียงสนทนา</span>
      </div>

      <section class="control-grid">
        <section class="control-panel microphone-panel" aria-labelledby="mic-title">
          <div class="panel-topline">
            <span class="panel-index">01</span>
            <span
              class="state-text"
              :class="micStatus === 'ready' ? (isMuted ? 'is-muted' : 'is-ready') : micStatus === 'error' ? 'has-error' : ''"
            >
              <span class="state-dot" />
              {{ micStatus === 'ready' ? (isMuted ? 'ปิดไมค์อยู่' : 'ไมค์พร้อมใช้') : micStatus === 'requesting' ? 'กำลังเปิดไมค์' : micStatus === 'error' ? 'เปิดไมค์ไม่สำเร็จ' : 'ยังไม่เปิดไมค์' }}
            </span>
          </div>

          <div class="panel-main">
            <div>
              <h3 id="mic-title">ไมโครโฟนของคุณ</h3>
              <p class="panel-description">
                {{ micStatus === 'ready'
                  ? (isMuted ? 'เสียงของคุณถูกปิดไว้ กดเปิดไมค์เมื่อต้องการพูด' : 'ไมโครโฟนพร้อมใช้งาน คนในห้องจะได้ยินเสียงของคุณ')
                  : 'อนุญาตให้เบราว์เซอร์ใช้ไมโครโฟนเพื่อเริ่มพูดคุย' }}
              </p>
            </div>

            <button
              v-if="micStatus !== 'ready'"
              class="mic-button"
              type="button"
              :disabled="micStatus === 'requesting'"
              @click="enableMicrophone"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              {{ micStatus === 'requesting' ? 'กำลังขอใช้ไมค์…' : 'เปิดไมโครโฟน' }}
            </button>

            <button
              v-else
              class="mic-button"
              :class="{ 'is-muted': isMuted }"
              type="button"
              :aria-pressed="!isMuted"
              @click="toggleMute"
            >
              <svg v-if="isMuted" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 9V6a3 3 0 0 0-5.8-1M5 11a7 7 0 0 0 12 4.9M19 11a7 7 0 0 1-.7 3M12 18v3m-4 0h8M3 3l18 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              {{ isMuted ? 'เปิดไมค์' : 'ปิดไมค์' }}
            </button>
          </div>

          <p v-if="micError" class="error-message" role="alert">{{ micError }}</p>
        </section>

        <section class="control-panel" aria-labelledby="connection-title">
          <div class="panel-topline">
            <span class="panel-index">02</span>
            <span class="state-text" :class="{ 'is-ready': connectionState === 'connected', 'has-error': connectionState === 'failed' }">
              <span class="state-dot" />
              {{ connectionState === 'connected' ? 'เชื่อมต่อเสียงแล้ว' : connectionState === 'failed' ? 'เชื่อมต่อไม่สำเร็จ' : connectionState === 'connecting' ? 'กำลังเชื่อมต่อเสียง' : 'ยังไม่มีการเชื่อมต่อ' }}
            </span>
          </div>

          <div class="connection-main">
            <div class="connection-mark" :class="{ 'is-connected': connectionState === 'connected' }" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M15 14.5 11.5 18a6 6 0 0 0 8.5 8.5l3.2-3.2M25 25.5l3.5-3.5a6 6 0 0 0-8.5-8.5l-3.2 3.2M16.5 23.5l7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <h3 id="connection-title">
                {{ connectionState === 'connected' ? 'พร้อมคุยแล้ว' : memberCount !== 2 ? 'กำลังรออีกคน' : micStatus !== 'ready' ? 'เปิดไมโครโฟนก่อน' : 'กำลังเชื่อมต่อเสียง' }}
              </h3>
              <p class="panel-description">
                {{ connectionState === 'connected'
                  ? 'การเชื่อมต่อเสียงพร้อมใช้งาน พูดคุยกันได้เลย'
                  : memberCount !== 2
                    ? 'เมื่อมีสมาชิกครบ 2 คน ระบบจะเริ่มเชื่อมต่อเสียง'
                    : micStatus !== 'ready'
                      ? 'เปิดไมโครโฟนเพื่อเริ่มการเชื่อมต่อเสียง'
                      : 'กำลังสร้างการเชื่อมต่อระหว่างอุปกรณ์ทั้งสอง' }}
              </p>
            </div>
          </div>

          <div v-if="remoteStream" class="audio-playback">
            <span>เสียงจากอีกฝ่าย</span>
            <audio ref="remoteAudio" autoplay controls playsinline />
          </div>
          <p v-if="webrtcError" class="error-message" role="alert">{{ webrtcError }}</p>
        </section>
      </section>

      <div v-if="roomError" class="notice-message" role="alert">
        <span class="notice-mark">!</span>
        <span>{{ roomError }}</span>
      </div>

      <footer class="page-footer">
        <span>ห้องเสียง</span>
        <span>รองรับสมาชิก 2 คน</span>
      </footer>
    </div>
  </main>
</template>

<style>
:root {
  color-scheme: dark;
  --page: #101210;
  --surface: #171a17;
  --surface-raised: #1c201c;
  --line: #2b302b;
  --line-soft: #232823;
  --text: #e7e9e4;
  --text-secondary: #a1a99f;
  --text-muted: #737d73;
  --accent: #a8bd91;
  --accent-strong: #bfd2a6;
  --accent-dark: #20291d;
  --danger: #d48b80;
  --danger-bg: #2a1d1b;
}

* {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  background: var(--page);
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: var(--page);
  color: var(--text);
  font-family: "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

button {
  font: inherit;
}

.page-shell {
  min-height: 100vh;
  padding: 0 32px;
}

.page-frame {
  width: min(100%, 900px);
  margin: 0 auto;
}

.topbar {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  text-decoration: none;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.2px;
}

.brand-mark {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  color: var(--accent);
}

.brand-mark svg {
  width: 28px;
  height: 28px;
}

.server-status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--text-muted);
  font-size: 12px;
}

.status-dot,
.state-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #697169;
}

.server-status.is-online {
  color: var(--accent);
}

.server-status.is-online .status-dot,
.state-text.is-ready .state-dot {
  background: #9fbd7e;
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 54px 0 34px;
}

.eyebrow {
  margin: 0 0 9px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}

.page-heading h1 {
  margin: 0;
  color: var(--text);
  font-size: clamp(30px, 5vw, 40px);
  font-weight: 650;
  letter-spacing: -1.2px;
  line-height: 1.35;
}

.page-description {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.8;
}

.room-number {
  display: grid;
  justify-items: end;
  gap: 2px;
  padding-bottom: 4px;
}

.room-number-label {
  color: var(--text-muted);
  font-size: 11px;
}

.room-number-value {
  color: var(--accent-strong);
  font-size: 25px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.8px;
}

.room-number-value span {
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 400;
}

.room-section,
.control-panel {
  border: 1px solid var(--line);
  background: var(--surface);
}

.room-section {
  padding: 22px 24px 18px;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.section-heading h2 {
  margin: 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 620;
}

.section-note {
  color: var(--text-muted);
  font-size: 12px;
}

.room-progress {
  height: 3px;
  margin: 17px 0 4px;
  overflow: hidden;
  background: #303630;
}

.room-progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 180ms ease;
}

.member-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 30px;
}

.member-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  border-bottom: 1px solid var(--line-soft);
}

.member-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #394237;
  border-radius: 50%;
  background: #222a20;
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 650;
}

.avatar-other {
  border-color: #363b38;
  background: #242825;
  color: #a8b0a8;
  font-variant-numeric: tabular-nums;
}

.member-details {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.member-name {
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}

.member-state {
  color: var(--text-muted);
  font-size: 11px;
}

.presence-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  margin-left: auto;
  border-radius: 50%;
  background: #626a62;
}

.presence-dot.is-present {
  background: #9fbd7e;
}

.room-hint {
  margin: 14px 0 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.7;
}

.controls-heading {
  margin: 35px 0 13px;
}

.control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.control-panel {
  min-width: 0;
  min-height: 225px;
  padding: 20px 21px;
}

.panel-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 20px;
}

.panel-index {
  color: var(--text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.state-text {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
}

.state-text .state-dot {
  width: 6px;
  height: 6px;
}

.state-text.is-ready {
  color: var(--accent);
}

.state-text.is-muted {
  color: #d6aa7d;
}

.state-text.is-muted .state-dot {
  background: #c99565;
}

.state-text.has-error {
  color: var(--danger);
}

.state-text.has-error .state-dot {
  background: var(--danger);
}

.panel-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 22px;
  margin-top: 27px;
}

/* Keep the main microphone action visually centered in its panel. */
.microphone-panel .panel-main {
  align-items: center;
  text-align: center;
}

.microphone-panel .panel-description {
  max-width: 340px;
}

.microphone-panel .mic-button {
  min-width: 184px;
  justify-content: center;
}

.control-panel h3 {
  margin: 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 620;
}

.panel-description {
  max-width: 360px;
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.8;
}

.mic-button {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 15px;
  border: 1px solid var(--accent);
  border-radius: 3px;
  background: var(--accent);
  color: #182016;
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
  transition: background 140ms ease, border-color 140ms ease;
}

.mic-button:hover:not(:disabled) {
  border-color: var(--accent-strong);
  background: var(--accent-strong);
}

.mic-button:focus-visible {
  outline: 2px solid var(--accent-strong);
  outline-offset: 3px;
}

.mic-button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.mic-button.is-muted {
  border-color: #4a4034;
  background: #302920;
  color: #e2c49f;
}

.mic-button.is-muted:hover:not(:disabled) {
  border-color: #66533e;
  background: #3a3025;
}

.mic-button svg {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
}

.connection-main {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  margin-top: 27px;
}

.connection-mark {
  width: 36px;
  height: 36px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--text-muted);
}

.connection-mark svg {
  width: 26px;
  height: 26px;
}

.connection-mark.is-connected {
  border-color: #47553e;
  color: var(--accent-strong);
}

.connection-main > div:last-child {
  min-width: 0;
}

.audio-playback {
  display: grid;
  gap: 9px;
  margin-top: 19px;
  padding-top: 14px;
  border-top: 1px solid var(--line-soft);
}

.audio-playback > span {
  color: var(--text-muted);
  font-size: 11px;
}

.audio-playback audio {
  width: 100%;
  height: 34px;
  color-scheme: dark;
}

.error-message {
  margin: 13px 0 0;
  color: var(--danger);
  font-size: 11px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.notice-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid #523430;
  background: var(--danger-bg);
  color: #e0aaa1;
  font-size: 12px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.notice-mark {
  width: 17px;
  height: 17px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
}

.page-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 38px;
  padding: 16px 0 22px;
  border-top: 1px solid var(--line);
  color: var(--text-muted);
  font-size: 11px;
}

@media (max-width: 700px) {
  .page-shell {
    padding: 0 20px;
  }

  .page-heading {
    padding-top: 42px;
  }

  .member-list {
    grid-template-columns: 1fr;
    column-gap: 0;
  }

  .member-row:last-child {
    border-bottom: 0;
  }

  .control-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .control-panel {
    min-height: 0;
  }

  .panel-main {
    margin-top: 22px;
  }

  .microphone-panel .panel-main {
    width: 100%;
    gap: 18px;
    padding: 4px 0 2px;
  }

  .microphone-panel .mic-button {
    min-width: min(220px, 100%);
  }

  .connection-main {
    margin-top: 22px;
  }
}

@media (max-width: 360px) {
  .page-shell {
    padding: 0 12px;
  }

  .room-section,
  .control-panel {
    padding-right: 14px;
    padding-left: 14px;
  }

  .panel-topline {
    align-items: flex-start;
  }

  .state-text {
    white-space: normal;
    text-align: right;
  }

  .page-heading {
    gap: 12px;
  }

  .page-description {
    max-width: 210px;
  }
}

@media (max-width: 420px) {
  .page-shell {
    padding: 0 15px;
  }

  .topbar {
    height: 64px;
  }

  .server-status {
    gap: 7px;
    font-size: 10px;
  }

  .page-heading {
    align-items: flex-start;
    padding: 35px 0 25px;
  }

  .page-heading h1 {
    font-size: 30px;
  }

  .page-description {
    max-width: 250px;
    font-size: 12px;
  }

  .room-number {
    padding-top: 5px;
  }

  .room-number-value {
    font-size: 22px;
  }

  .room-section {
    padding: 18px 16px 15px;
  }

  .control-panel {
    padding: 18px 16px;
  }

  .section-note {
    font-size: 10px;
  }

  .page-footer {
    font-size: 10px;
  }
}

@media (max-width: 360px) {
  .page-shell {
    padding-right: 12px;
    padding-left: 12px;
  }

  .page-description {
    max-width: 210px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
