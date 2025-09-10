import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'

import { APP_ID, fetchToken } from './client'

export interface PreviewStream {
  channelName: string
  client: IAgoraRTCClient
  videoTrack?: IRemoteVideoTrack
  audioTrack?: IRemoteAudioTrack
  container: HTMLElement
}

export class PreviewManager {
  private static instance: PreviewManager
  private currentPreview: PreviewStream | null = null
  private isInitializing = false

  private constructor() {}

  static getInstance(): PreviewManager {
    if (!PreviewManager.instance) {
      PreviewManager.instance = new PreviewManager()
    }
    return PreviewManager.instance
  }

  async startPreview(
    channelName: string,
    container: HTMLElement
  ): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      console.log('PreviewManager: Already initializing, skipping...')
      return
    }

    this.isInitializing = true

    try {
      // Stop current preview if exists
      await this.stopCurrentPreview()

      console.log(
        `PreviewManager: Starting preview for channel: ${channelName}`
      )

      // Create new Agora client for preview
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })

      // Set up event handlers
      const onUserPublished = async (
        user: IAgoraRTCRemoteUser,
        type: 'video' | 'audio'
      ) => {
        try {
          await client.subscribe(user, type)

          if (type === 'video' && user.videoTrack) {
            // Subscribe to low stream for preview
            await client.setRemoteVideoStreamType(user.uid, 1) // 1 = low stream
            const videoTrack = user.videoTrack as IRemoteVideoTrack
            videoTrack.play(container, { fit: 'cover' })

            if (this.currentPreview) {
              this.currentPreview.videoTrack = videoTrack
            }
          }

          if (type === 'audio' && user.audioTrack) {
            // Mute audio for preview
            const audioTrack = user.audioTrack as IRemoteAudioTrack
            audioTrack.setVolume(0)

            if (this.currentPreview) {
              this.currentPreview.audioTrack = audioTrack
            }
          }
        } catch (error) {
          console.error('PreviewManager: Error handling user published:', error)
        }
      }

      const onUserUnpublished = () => {
        console.log('PreviewManager: User unpublished')
      }

      client.on('user-published', onUserPublished)
      client.on('user-unpublished', onUserUnpublished)

      // Join channel as audience
      await client.setClientRole('audience')
      const { token } = await fetchToken(channelName, 'subscriber')
      await client.join(APP_ID, channelName, token || null, null)

      // Subscribe to existing users
      for (const user of client.remoteUsers) {
        if (user.hasVideo) {
          await client.subscribe(user, 'video')
          await client.setRemoteVideoStreamType(user.uid, 1) // Low stream
          if (user.videoTrack) {
            user.videoTrack.play(container, { fit: 'cover' })
          }
        }
        if (user.hasAudio) {
          await client.subscribe(user, 'audio')
          if (user.audioTrack) {
            user.audioTrack.setVolume(0) // Mute
          }
        }
      }

      // Store current preview
      this.currentPreview = {
        channelName,
        client,
        container,
      }

      console.log(
        `PreviewManager: Preview started successfully for ${channelName}`
      )
    } catch (error) {
      console.error('PreviewManager: Error starting preview:', error)
      throw error
    } finally {
      this.isInitializing = false
    }
  }

  async stopCurrentPreview(): Promise<void> {
    if (!this.currentPreview) {
      return
    }

    console.log(
      `PreviewManager: Stopping preview for channel: ${this.currentPreview.channelName}`
    )

    try {
      // Stop video playback
      if (this.currentPreview.videoTrack) {
        this.currentPreview.videoTrack.stop()
      }

      // Leave channel and cleanup
      await this.currentPreview.client.leave()

      // Clear container
      this.currentPreview.container.innerHTML = ''
    } catch (error) {
      console.error('PreviewManager: Error stopping preview:', error)
    } finally {
      this.currentPreview = null
    }
  }

  getCurrentChannel(): string | null {
    return this.currentPreview?.channelName || null
  }

  isPreviewActive(): boolean {
    return this.currentPreview !== null
  }

  isPreviewForChannel(channelName: string): boolean {
    return this.currentPreview?.channelName === channelName
  }
}

// Export singleton instance
export const previewManager = PreviewManager.getInstance()
