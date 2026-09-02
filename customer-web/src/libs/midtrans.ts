// src/lib/midtrans.ts
export function loadSnap(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).snap) return resolve()
    const s = document.createElement('script')
    s.src =
      import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
    s.setAttribute(
      'data-client-key',
      import.meta.env.VITE_MIDTRANS_CLIENT_KEY
    )
    s.onload = () => resolve()
    s.onerror = reject
    document.body.appendChild(s)
  })
}