// Custom memory-based rate limiting middleware for DEVgauge backend
// Prevents brute-force attacks on auth endpoints without external dependencies

const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const maxRequests = 50; // max 50 authentication requests per window per IP

const ipRequests = new Map();

// Cleanup routine to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequests.entries()) {
    if (now - data.startTime > rateLimitWindowMs) {
      ipRequests.delete(ip);
    }
  }
}, 5 * 60 * 1000); // run cleanup every 5 minutes

module.exports = function (req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, {
      startTime: now,
      count: 1
    });
    return next();
  }

  const clientData = ipRequests.get(ip);

  // If window has passed, reset start time and request count
  if (now - clientData.startTime > rateLimitWindowMs) {
    clientData.startTime = now;
    clientData.count = 1;
    return next();
  }

  clientData.count += 1;

  if (clientData.count > maxRequests) {
    return res.status(429).json({
      message: 'Too many authentication requests from this IP. Please try again after 15 minutes.'
    });
  }

  next();
};
