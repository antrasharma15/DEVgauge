/**
 * Express middleware to log request durations.
 * Flags requests taking longer than 2 seconds with a [SLOW] warning.
 */
const durationLogger = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(1);
    
    let logMessage = `${req.method} ${req.originalUrl} - ${res.statusCode} (${timeInMs}ms)`;
    
    if (parseFloat(timeInMs) > 2000) {
      console.warn(`[SLOW] ${logMessage}`);
    } else {
      console.log(logMessage);
    }
  });

  next();
};

module.exports = durationLogger;
