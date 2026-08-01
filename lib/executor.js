/**
 * Responsible for sequentially executing actions on the database
 * Modernized: ES6 class, replaced async.queue with a native serial queue
 *
 * The processing is made robust so that a throwing callback or a falsy
 * callback does NOT stall the whole chain. This matches the semantics of
 * the original async.queue-based executor.
 */

function invokeUserCallback(fn, args) {
  try {
    fn.apply(null, args);
  } catch (err) {
    // A callback that throws must not stall the queue. Surface the error as
    // an uncaughtException (as the original async.queue did) but keep
    // processing subsequent tasks.
    process.nextTick(function () { throw err; });
  }
}

class Executor {
  constructor() {
    this.buffer = [];
    this.ready = false;
    this.queueRunning = false;
    this.queue = [];
  }

  /**
   * Internal: process the queue sequentially
   */
  _processQueue() {
    if (this.queueRunning) { return; }
    this.queueRunning = true;

    const runNext = () => {
      if (this.queue.length === 0) {
        this.queueRunning = false;
        return;
      }

      const task = this.queue.shift();
      const args = [...task.arguments];
      const lastArg = args[args.length - 1];

      // Build the trailing callback that advances the queue exactly once.
      const complete = () => process.nextTick(runNext);

      if (typeof lastArg === 'function') {
        // Real callback: invoke it first (guarded), then advance.
        args[args.length - 1] = function (...cbArgs) {
          invokeUserCallback(lastArg, cbArgs);
          complete();
        };
      } else if (!lastArg && args.length !== 0) {
        // falsy/undefined/null callback — treat as a no-op callback so the
        // chain is not stalled.
        args[args.length - 1] = function () { complete(); };
      } else {
        // No callback supplied at all.
        args.push(function () { complete(); });
      }

      task.fn.apply(task.this, args);
    };

    runNext();
  }

  /**
   * If executor is ready, queue task (and process it immediately if executor was idle)
   * If not, buffer task for later processing
   * @param {Object} task
   * task.this - Object to use as this
   * task.fn - Function to execute
   * task.arguments - Array of arguments
   * @param {Boolean} forceQueuing Optional (defaults to false) force executor to queue task even if it is not ready
   */
  push(task, forceQueuing) {
    if (this.ready || forceQueuing) {
      this.queue.push(task);
      this._processQueue();
    } else {
      this.buffer.push(task);
    }
  }

  /**
   * Queue all tasks in buffer (in the same order they came in)
   * Automatically sets executor as ready
   */
  processBuffer() {
    this.ready = true;
    this.queue.push(...this.buffer);
    this.buffer = [];
    this._processQueue();
  }
}


// Interface
module.exports = Executor;
