/**
 * Wrapper for async route handlers to catch errors and return a JSON error response with status 400.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    try {
      Promise.resolve(fn(req, res, next)).catch((err) => {
        if (!res.headersSent) {
          res.status(400).json({ error: err.message || 'An unexpected error occurred' });
        }
      });
    } catch (err) {
      if (!res.headersSent) {
        res.status(400).json({ error: err.message || 'An unexpected error occurred' });
      }
    }
  };
}

module.exports = asyncHandler;
