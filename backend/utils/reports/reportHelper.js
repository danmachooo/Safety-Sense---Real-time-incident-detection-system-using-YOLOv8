/**
 * Validate report parameters
 * @param {Object} params - Report parameters to validate
 * @returns {Object} Validation result
 */
export const validateReportParams = (params) => {
  const errors = [];

  // Validate date range
  if (params.startDate && params.endDate) {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);

    if (isNaN(start.getTime())) {
      errors.push("Invalid start date format");
    }

    if (isNaN(end.getTime())) {
      errors.push("Invalid end date format");
    }

    if (start > end) {
      errors.push("Start date must be before end date");
    }

    // Check if date range is too large (more than 1 year)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end - start > oneYear) {
      errors.push("Date range cannot exceed 1 year");
    }
  }

  // Validate limit parameter
  if (params.limit) {
    const limit = Number.parseInt(params.limit);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      errors.push("Limit must be a number between 1 and 1000");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
