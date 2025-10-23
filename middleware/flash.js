/**
 * Flash message middleware - maps query parameters to alert locals
 */

function flashMiddleware(req, res, next) {
  // Map query parameters to res.locals for alerts partial
  if (req.query.error) {
    res.locals.errorMessage = req.query.error;
  }
  
  if (req.query.message) {
    res.locals.successMessage = req.query.message;
  }
  
  if (req.query.info) {
    res.locals.infoMessage = req.query.info;
  }
  
  if (req.query.warning) {
    res.locals.warningMessage = req.query.warning;
  }
  
  next();
}

module.exports = flashMiddleware;
