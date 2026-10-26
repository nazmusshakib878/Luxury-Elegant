const { verifyToken } = require('./security');

function getRequestUser(request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;
  return verifyToken(authorization.slice(7));
}

function isAdminRequest(request) {
  return getRequestUser(request)?.role === 'admin';
}

module.exports = { getRequestUser, isAdminRequest };
