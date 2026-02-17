export function runBackgroundJob(job, timeout = 200) {
  return new Promise((resolve, reject) => {
    const execute = () => {
      try {
        resolve(job());
      } catch (error) {
        reject(error);
      }
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(execute, { timeout });
      return;
    }

    setTimeout(execute, 0);
  });
}
