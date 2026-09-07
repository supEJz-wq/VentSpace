/**
 * Helper to manage a stable anonymous device ID.
 */
export function getDeviceId() {
  let id = localStorage.getItem('freespace_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('freespace_device_id', id);
  }
  return id;
}

/**
 * Helper to lock a username to a device ID with a timestamp.
 */
export function getStoredUsername() {
  const saved = localStorage.getItem('freespace_username_data');
  if (!saved) return null;
  return JSON.parse(saved); // returns { name, timestamp }
}

export function saveStoredUsername(username) {
  const data = { name: username, timestamp: Date.now() };
  localStorage.setItem('freespace_username_data', JSON.stringify(data));
  localStorage.setItem('freespace_username', username); // legacy support
}
