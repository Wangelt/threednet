const ApiError = require('../utils/ApiError');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message);
      return next(new ApiError(400, 'Validation failed', details));
    }

    req.validated = req.validated || {};
    req.validated[property] = value;

    // Express 5: req.query / req.params are read-only getters — don't assign
    if (property !== 'query' && property !== 'params') {
      req[property] = value;
    }

    return next();
  };
}

module.exports = validate;
