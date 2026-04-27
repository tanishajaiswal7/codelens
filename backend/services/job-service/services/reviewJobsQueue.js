const REVIEW_JOBS = 'REVIEW_JOBS';

const queue = [];
const consumers = [];
let isDraining = false;

const drainQueue = async () => {
  if (isDraining) {
    return;
  }

  isDraining = true;

  while (queue.length > 0) {
    const payload = queue.shift();

    // Broadcast each queued payload to all registered consumers.
    for (const handler of consumers) {
      try {
        await handler(payload);
      } catch (error) {
        console.error('REVIEW_JOBS consumer error:', error);
      }
    }
  }

  isDraining = false;
};

export const reviewJobsQueue = {
  name: REVIEW_JOBS,

  publish(payload) {
    queue.push(payload);
    setImmediate(() => {
      void drainQueue();
    });
  },

  consume(handler) {
    consumers.push(handler);

    if (queue.length > 0) {
      setImmediate(() => {
        void drainQueue();
      });
    }

    return () => {
      const idx = consumers.indexOf(handler);
      if (idx >= 0) {
        consumers.splice(idx, 1);
      }
    };
  },
};
