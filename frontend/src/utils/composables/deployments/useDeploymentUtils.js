export function useDeploymentUtils() {
  const statusColor = (status) => {
    switch (status) {
      case "DEPLOYED":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
        };
      case "RETURNED":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
        };
      case "LOST":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
        };
      case "DAMAGED":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-200",
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Check if deployment is overdue
  const isOverdue = (deployment) => {
    if (deployment.status !== "DEPLOYED") return false;
    return new Date(deployment.expected_return_date) < new Date();
  };

  // Get days until return
  const getDaysUntilReturn = (deployment) => {
    if (deployment.status !== "DEPLOYED") return null;
    const today = new Date();
    const returnDate = new Date(deployment.expected_return_date);
    const diffTime = returnDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return {
    statusColor,
    formatDate,
    isOverdue,
    getDaysUntilReturn,
  };
}
