const OFFLINE_QUEUE_KEY = 'pva_offline_queue_v1';
let syncHandler = null;

function readQueue() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  globalThis.localStorage?.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const OfflineSync = {
  setSyncHandler(handler) {
    syncHandler = typeof handler === 'function' ? handler : null;
  },

  enqueue(action, payload) {
    const queue = readQueue();
    const item = {
      action,
      payload,
      timestamp: Date.now(),
      id: makeId(),
    };
    queue.push(item);
    writeQueue(queue);
    return { queued: true, id: item.id };
  },

  async dequeue(apiCall = syncHandler) {
    const queue = readQueue();
    if (!apiCall || queue.length === 0) {
      return { synced: queue.length === 0, pending: queue.length };
    }

    const remaining = [];

    for (const item of queue) {
      try {
        await apiCall(item.action, item.payload);
      } catch {
        remaining.push(item);
      }
    }

    writeQueue(remaining);
    return { synced: remaining.length === 0, pending: remaining.length };
  },

  getStatus() {
    const queue = readQueue();
    return {
      online: globalThis.navigator?.onLine ?? true,
      pending: queue.length,
      lastSync: queue[queue.length - 1]?.timestamp || null,
    };
  },
};

const browserWindow = globalThis?.window;

if (browserWindow) {
  browserWindow.addEventListener('online', () => {
    if (syncHandler) {
      OfflineSync.dequeue(syncHandler).catch(() => {});
    }
  });

  browserWindow.addEventListener('offline', () => {
    console.log('Offline mode active');
  });
}
