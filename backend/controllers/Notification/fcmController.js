// const { StatusCodes } = require("http-status-codes");
// const { BadRequestError, NotFoundError } = require("../../utils/Error");
// const fcmService = require("../../services/firebase/fcmService");

import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../../utils/Error.js";
import { sendTopicNotification } from "../../services/firebase/fcmService.js";

const _sendTopicNotification = async (req, res, next) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!title || !topic || !body) {
      throw new BadRequestError("Topic, Title, Body, and Data are required. ");
    }

    const result = await sendTopicNotification(topic, title, body, data || {});
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
    const result = await sendTopicNotification(
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

export { _sendTopicNotification, notifyAllResponders };
