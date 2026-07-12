import { ref, readonly, watch } from 'vue'
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor'
import { isNative } from '@/services/platform'
import { syncEntitlement } from '@/services/ai'
import { useAuth } from './useAuth'
import { setOptimisticPremium } from './useCouple'

// RevenueCat-App-User-ID = das PAAR, nicht der Nutzer. Beide Partner melden
// sich unter derselben ID an, teilen sich damit denselben Subscriber und
// kommen an dieselben Käufe (auch "Wiederherstellen" auf dem zweiten Gerät).
// Muss zu coupleIdFromAppUserId() in functions/src/lib/writeEntitlement.ts passen.
const RC_PREFIX = 'couple_'

const ENTITLEMENT_ID = 'premium'

const packages = ref<PurchasesPackage[]>([])
const purchasing = ref(false)
const restoring = ref(false)
const error = ref<string | null>(null)

let configured = false
let configuredCoupleId: string | null = null

async function loadOfferings() {
  try {
    const offerings = await Purchases.getOfferings()
    packages.value = offerings.current?.availablePackages ?? []
  } catch (e: any) {
    console.error('RevenueCat: Angebote konnten nicht geladen werden', e)
    packages.value = []
  }
}

// Im Web passiert hier bewusst nichts: gekauft wird nur in der App (Play
// Billing). isPremium funktioniert im Browser trotzdem, weil es aus dem
// Couple-Doc kommt — wer in der App bezahlt hat, hat auch im Browser Premium.
async function init(coupleId: string) {
  if (!isNative) return
  if (configuredCoupleId === coupleId) return

  const apiKey = import.meta.env.VITE_RC_ANDROID_KEY
  if (!apiKey) {
    console.warn('VITE_RC_ANDROID_KEY fehlt — Käufe sind deaktiviert.')
    return
  }

  try {
    if (!configured) {
      await Purchases.configure({ apiKey, appUserID: `${RC_PREFIX}${coupleId}` })
      configured = true
    } else {
      await Purchases.logIn({ appUserID: `${RC_PREFIX}${coupleId}` })
    }
    configuredCoupleId = coupleId
    await loadOfferings()
  } catch (e: any) {
    console.error('RevenueCat: Initialisierung fehlgeschlagen', e)
  }
}

async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  if (!isNative || purchasing.value) return false
  purchasing.value = true
  error.value = null

  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg })
    const active = !!result.customerInfo.entitlements.active[ENTITLEMENT_ID]
    if (!active) return false

    // Sofort freischalten, dann die Wahrheit nachziehen. Der Webhook schreibt
    // dasselbe noch einmal — das ist die belastbare Variante, syncEntitlement
    // nur die schnelle.
    setOptimisticPremium(true)
    await syncEntitlement(configuredCoupleId!).catch((e) => {
      console.error('syncEntitlement nach Kauf fehlgeschlagen', e)
    })
    return true
  } catch (e: any) {
    // Abbruch durch den Nutzer ist kein Fehler, den man ihm zeigen müsste.
    if (e?.code === 'PURCHASE_CANCELLED' || e?.userCancelled) return false
    console.error('Kauf fehlgeschlagen', e)
    error.value = 'Der Kauf konnte nicht abgeschlossen werden.'
    return false
  } finally {
    purchasing.value = false
  }
}

async function restore(): Promise<boolean> {
  if (!isNative || restoring.value || !configuredCoupleId) return false
  restoring.value = true
  error.value = null

  try {
    const result = await Purchases.restorePurchases()
    const active = !!result.customerInfo.entitlements.active[ENTITLEMENT_ID]
    if (active) setOptimisticPremium(true)
    await syncEntitlement(configuredCoupleId)
    if (!active) error.value = 'Kein aktives Abo für dieses Google-Konto gefunden.'
    return active
  } catch (e: any) {
    console.error('Wiederherstellen fehlgeschlagen', e)
    error.value = 'Käufe konnten nicht wiederhergestellt werden.'
    return false
  } finally {
    restoring.value = false
  }
}

// Beim App-Resume: RevenueCat kennt den Kauf u. U. schon, während der Webhook
// noch unterwegs ist (oder verloren ging). Nur dann nachziehen — nicht bei
// jedem Resume eine Funktion aufrufen.
async function refreshOnResume() {
  if (!isNative || !configuredCoupleId) return
  try {
    const { customerInfo } = await Purchases.getCustomerInfo()
    if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
      await syncEntitlement(configuredCoupleId)
    }
  } catch (e) {
    console.error('Abo-Abgleich beim Resume fehlgeschlagen', e)
  }
}

// Ein Watcher fürs ganze Modul — wie in useCouple.
watch(
  () => useAuth().user.value?.coupleId,
  (coupleId) => {
    if (coupleId) init(coupleId)
  },
  { immediate: true }
)

export function usePremium() {
  return {
    packages: readonly(packages),
    purchasing: readonly(purchasing),
    restoring: readonly(restoring),
    error: readonly(error),
    canPurchase: isNative,
    purchase,
    restore,
    refreshOnResume
  }
}
