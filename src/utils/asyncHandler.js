const asyncRequestHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

const asyncFunctionHandler = (func) => {
  return (...args) => {
    Promise.resolve(func(...args)).catch((err) => console.log("error", err));
  };
};

export { asyncFunctionHandler, asyncRequestHandler };
