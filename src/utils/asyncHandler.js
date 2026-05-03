module.exports = function asyncHandler(fn) {
  return function asyncUtil(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};
