import { supabase } from './supabase';
import { getDeviceId } from './identity';

let channel = null;
const listeners = new Set();

/**
 * Join the shared "online-users" presence channel and broadcast
 * this device as online. Presence key = device_id, so multiple
 * tabs on one device count as a single visitor.
 */
export function startPresence() {
  if (channel) return;
  const deviceId = getDeviceId();

  channel = supabase.channel('online-users', {
    config: { presence: { key: deviceId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.entries(state).map(([key, metas]) => ({
        device_id: key,
        online_at: metas[0]?.online_at ?? null,
      }));
      listeners.forEach(cb => cb(users));
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        channel.track({ online_at: Date.now() });
      }
    });
}

/** Subscribe to online-user list changes. Returns unsubscribe fn. */
export function onPresenceChange(cb) {
  startPresence();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
