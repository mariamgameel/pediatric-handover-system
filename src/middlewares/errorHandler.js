const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (process.env.NODE_ENV === "development") {
        console.error(err);
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            stack: err.stack,
        });
    }

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    console.error("ERROR", err);
    return res.status(500).json({
        success: false,
        message: "Something went wrong",
    });
};

module.exports = errorHandler;