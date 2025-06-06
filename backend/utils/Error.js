import { StatusCodes } from "http-status-codes";

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = "BadRequestError";
    this.message = message;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
    this.message = message;
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = "ForbiddenError";
    this.message = message;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.message = message;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
    this.message = message;
  }
}

function makeError(error) {
  const defaultError = {
    name: error.name,
    message: error.message,
  };

  if (error.message.includes("Malformed JSON")) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      error: { name: "BadRequestError", message: error.message },
    };
  }

  if (error instanceof BadRequestError) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      error: defaultError,
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      statusCode: StatusCodes.UNAUTHORIZED,
      error: defaultError,
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      statusCode: StatusCodes.FORBIDDEN,
      error: defaultError,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      statusCode: StatusCodes.NOT_FOUND,
      error: defaultError,
    };
  }

  if (error instanceof ConflictError) {
    return {
      statusCode: StatusCodes.CONFLICT,
      error: defaultError,
    };
  }

  return {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    error: defaultError,
  };
}

export {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  makeError,
};
