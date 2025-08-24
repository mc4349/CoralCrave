/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_AGORA_APP_ID: string
  readonly AGORA_TOKEN_SERVER_URL: string
  readonly STRIPE_SECRET_KEY: string
  readonly STRIPE_WEBHOOK_SECRET: string
  readonly SITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
