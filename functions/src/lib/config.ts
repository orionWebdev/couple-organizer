import { defineSecret } from 'firebase-functions/params'

export const REGION = 'europe-west1'

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
export const REVENUECAT_SECRET_KEY = defineSecret('REVENUECAT_SECRET_KEY')
export const REVENUECAT_WEBHOOK_SECRET = defineSecret('REVENUECAT_WEBHOOK_SECRET')

// Der Android-WebView meldet sich als https://localhost (androidScheme: 'https'),
// iOS als capacitor://localhost. Beide stehen NICHT in der Default-Allowlist der
// Callables — ohne sie schlägt jeder Aufruf aus der App am CORS-Preflight fehl.
export const CORS_ORIGINS = [
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://couple-organizer-8b245.web.app',
  'https://couple-organizer-8b245.firebaseapp.com'
]
