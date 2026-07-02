// Web push client helpers — goal / full-time alerts for favorited teams.
// Server endpoints are cache-driven (the API detects goals from data it already
// polls), so enabling alerts adds zero API-Football quota cost.

const API = '/api/push';

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  return pushSupported() ? Notification.permission : 'unsupported';
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Ask permission, subscribe, and register the subscription + team ids with the API. */
export async function enablePush(teamIds: number[], userId?: string | null): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    const keyRes = await fetch(`${API}/vapid-key`);
    if (!keyRes.ok) return false;
    const { key } = await keyRes.json();

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key) as BufferSource,
      });
    }

    const res = await fetch(`${API}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), teamIds, userId: userId || null }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Remove the subscription locally and from the API. */
export async function disablePush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  try {
    await fetch(`${API}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch { /* best-effort */ }
  try { await sub.unsubscribe(); } catch { /* best-effort */ }
}

/** Keep the server's team list in sync when favorites change (no permission prompt). */
export async function syncPushTeams(teamIds: number[]): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const sub = await getPushSubscription();
  if (!sub) return;
  try {
    await fetch(`${API}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), teamIds }),
    });
  } catch { /* best-effort */ }
}
