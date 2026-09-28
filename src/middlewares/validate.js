const AppError = require("../utils/AppError");

const validate = (schema) => {
    return (req, res, next) => {
        const validationTargets = ["body", "params", "query"];

        for (const target of validationTargets) {
            if (schema[target]) {
                const { error, value } = schema[target].validate(req[target], {
                    abortEarly: false,
                    stripUnknown: true,
                });

                if (error) {
                    const message = error.details.map((detail) => detail.message).join(", ");
                    return next(new AppError(`Validation error: ${message}`, 400));
                }

                // Replace with validated/sanitized value
                req[target] = value;
            }
        }

        next();
    };
};

module.exports = validate;
