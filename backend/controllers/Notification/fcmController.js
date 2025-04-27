const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../../utils/Error");
const fcmService = require("../../services/firebase/fcmService");

const sendTopicNotification = async (req, res, next) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!title || !topic || !body) {
      throw new BadRequestError("Topic, Title, Body, and Data are required. ");
    }

    const result = await fcmService.sendTopicNotification(
      topic,
      title,
      body,
      data || {}
    );
    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error("An error occurred: " + error);
    next(error);
  }
};

const notifyAllResponders = async (req, res) => {
  const { title, body, incidentId, data } = req.body;
  try {
    // Send to all responders topic
    const result = await fcmService.sendTopicNotification(
      "all_responders",
      title,
      body,
      incidentId,
      data
    );

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error("Error sending notification:", error);
    next(error);
  }
};

module.exports = {
  sendTopicNotification,

  notifyAllResponders,
};
