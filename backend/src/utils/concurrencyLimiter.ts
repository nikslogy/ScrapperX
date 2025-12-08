/**
 * Global concurrency limiter for browser-based operations
 * 
 * This limits the total number of concurrent Playwright browser instances
 * across all requests to prevent server overload.
 */

// Maximum concurrent browser operations (adjust based on VPS RAM)
// 2GB RAM = ~3 concurrent, 4GB RAM = ~5 concurrent
const MAX_CONCURRENT_BROWSERS = parseInt(process.env.MAX_CONCURRENT_BROWSERS || '3', 10);

let currentlyRunning = 0;
const queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
}> = [];

// How long to wait in queue before giving up (2 minutes)
const QUEUE_TIMEOUT = 120000;

/**
 * Acquire a slot to run a browser operation
 * Returns a release function that must be called when done
 */
export async function acquireBrowserSlot(): Promise<() => void> {
    return new Promise((resolve, reject) => {
        const tryAcquire = () => {
            if (currentlyRunning < MAX_CONCURRENT_BROWSERS) {
                currentlyRunning++;
                console.log(`🔓 Browser slot acquired (${currentlyRunning}/${MAX_CONCURRENT_BROWSERS} in use)`);

                const release = () => {
                    currentlyRunning--;
                    console.log(`🔒 Browser slot released (${currentlyRunning}/${MAX_CONCURRENT_BROWSERS} in use)`);
                    processQueue();
                };

                resolve(release);
            } else {
                // Add to queue with timeout
                const timeout = setTimeout(() => {
                    const index = queue.findIndex(q => q.timeout === timeout);
                    if (index !== -1) {
                        queue.splice(index, 1);
                    }
                    reject(new Error(`Request queued too long. Server is busy. Please try again later. (${currentlyRunning} browsers running)`));
                }, QUEUE_TIMEOUT);

                queue.push({ resolve: () => tryAcquire(), reject, timeout });
                console.log(`⏳ Request queued (position ${queue.length}, ${currentlyRunning}/${MAX_CONCURRENT_BROWSERS} browsers running)`);
            }
        };

        tryAcquire();
    });
}

function processQueue() {
    if (queue.length > 0 && currentlyRunning < MAX_CONCURRENT_BROWSERS) {
        const next = queue.shift();
        if (next) {
            clearTimeout(next.timeout);
            next.resolve();
        }
    }
}

/**
 * Get current concurrency stats
 */
export function getConcurrencyStats() {
    return {
        running: currentlyRunning,
        queued: queue.length,
        maxConcurrent: MAX_CONCURRENT_BROWSERS
    };
}

/**
 * Wrapper to run a browser operation with concurrency control
 */
export async function withBrowserSlot<T>(operation: () => Promise<T>): Promise<T> {
    const release = await acquireBrowserSlot();
    try {
        return await operation();
    } finally {
        release();
    }
}
