// controllers/getSentMails.controller.js
import { SendMail } from "../models/SendMail.model.js";

export const getSentMails = async (req, res) => {
    try {
        const sender = req.user_from_cookies;

        const sentMails = await SendMail.find({
            senderUser: sender._id,
            status: "sent",
        })
            .sort({ createdAt: -1 })
            .select("-__v");

        return res.json({ mails: sentMails });
    } catch (error) {
        console.error("❌ GET SENT MAILS FAILED:", error.message);
        return res.status(500).json({ message: "Failed to fetch sent mails" });
    }
};