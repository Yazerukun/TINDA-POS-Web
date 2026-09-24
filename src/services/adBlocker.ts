import { useState, useEffect, useCallback } from 'react'

/**
 * AdBlocker detection service for TINDA POS Web
 * Detects Brave Shields, uBlock Origin, Adblock Plus, and DNS sinkholes (Pi-hole)
 */

export interface AdBlockerStatus {
  isBlocked: boolean
  isChecking: boolean
  checkAdBlocker: () => Promise<boolean>
}

export async function detectAdBlocker(): Promise<boolean> {
  // Method 1: DOM Bait Element Check
  let domBlocked = false
  try {
    const bait = document.createElement('div')
    bait.className =
      'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-text ad-placement ad-banner adsbox'
    bait.setAttribute(
      'style',
      'position: absolute !important; top: -9999px !important; left: -9999px !important; width: 10px !important; height: 10px !important; pointer-events: none !important;'
    )
    bait.setAttribute('aria-hidden', 'true')
    document.body.appendChild(bait)

    // Give DOM a microtask to evaluate CSS filters / rules
    await new Promise((resolve) => setTimeout(resolve, 30))

    const styles = window.getComputedStyle(bait)
    if (
      bait.offsetParent === null ||
      bait.offsetHeight === 0 ||
      bait.offsetWidth === 0 ||
      bait.clientHeight === 0 ||
      bait.clientWidth === 0 ||
      styles.display === 'none' ||
      styles.visibility === 'hidden'
    ) {
      domBlocked = true
    }

    bait.remove()
  } catch {
    domBlocked = false
  }

  if (domBlocked) {
    return true
  }

  // Method 2: Network Script Probe to Google AdSense
  let networkBlocked = false
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)

    await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
  } catch (err: any) {
    // If request was aborted by timeout, don't necessarily treat as adblocker (could be slow net)
    if (err?.name !== 'AbortError') {
      networkBlocked = true
    }
  }

  return networkBlocked
}

export function useAdBlocker(): AdBlockerStatus {
  const [isBlocked, setIsBlocked] = useState<boolean>(false)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  const check = useCallback(async (): Promise<boolean> => {
    setIsChecking(true)
    try {
      const blocked = await detectAdBlocker()
      setIsBlocked(blocked)
      return blocked
    } catch {
      setIsBlocked(false)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  return {
    isBlocked,
    isChecking,
    checkAdBlocker: check
  }
}
