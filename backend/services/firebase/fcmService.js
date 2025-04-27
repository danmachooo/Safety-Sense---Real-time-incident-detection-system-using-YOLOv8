const admin = require("../../config/firebase/firebase");
const { BadRequestError } = require("../../utils/Error");

const sendTopicNotification = async (
  topic,
  title,
  body,
  incidentId,
  data = {}
) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        alertId: String(incidentId),
        priority: "high",
        ...data,
      },
      android: {
        priority: "high",
        ttl: 3600 * 1000,
        notification: {
          channel_id: "incident_alerts",
          visibility: "public",
          notification_priority: "PRIORITY_MAX",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
      },
      topic,
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending notification:", error);
    throw new Error("Error sending notifications");
  }
};

module.exports = {
  sendTopicNotification,
};
