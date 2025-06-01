const admin = require("./config/firebase/firebase");

import admin from "./config/firebase/firebase.js";

export async function testTopicNotification() {
  try {
    // 1. Log the test start
    console.log("=== Starting topic notification test ===");
    console.log(`Testing topic: all_responders at ${new Date().toISOString()}`);

    // 2. Create the message
    const message = {
      notification: {
        title: "Test Notification",
        body: "This is a topic message sent to all_responders",
      },
      data: {
        testId: Date.now().toString(),
        type: "debug",
      },
      topic: "all_responders",
    };

    console.log("Message payload:", JSON.stringify(message, null, 2));

    // 3. Send the message and log results
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);

    // 4. Add verification step (requires Firebase Admin 9+)
    try {
      const topicInfo = await admin.messaging().getTopic("all_responders");
      console.log("Topic info:", topicInfo);
    } catch (error) {
      console.warn(
        "Could not fetch topic info (requires Firebase Admin SDK v9+):",
        error.message
      );
    }

    console.log("=== Test completed ===");
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending test notification:", error);
    return { success: false, error: error.message };
  }
}

// Additional debug functions
export async function checkTokenSubscription(token) {
  try {
    // Note: This is a pseudo-check - actual implementation may vary
    const appInstance = await admin.instanceId().getAppInstance(token);
    console.log("Token registration info:", appInstance);
    return { isActive: true };
  } catch (error) {
    console.log("Token not active:", error.message);
    return { isActive: false };
  }
}

// Run the test
testTopicNotification()
  .then((result) => console.log("Test result:", result))
  .catch((err) => console.error("Test failed:", err));
