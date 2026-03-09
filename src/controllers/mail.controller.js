import { Mail } from "../models/Mail.model.js";
// import { InboundMail } from "../models/inboundMail.schema.js";
import InboundMail from "../models/inboundMail.schema.js";
export const getMyMails = async (req, res) => {
  try {
    // const userEmail = req.user.email; // 🔥 from verified JWT
    const userEmail = req.user_from_cookies.email; // 🔥 from verified JWT


    const mails = await Mail.find({ to: userEmail })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      count: mails.length,
      mails,
    });
  } catch (error) {
    console.error("Get mails error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyMails_fromInboundMailSchema = async (req, res) => {
  try {
    const userEmail = req.user_from_cookies.email; // from verified JWT

    const mails = await InboundMail.find({
      to: userEmail,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      count: mails.length,
      mails,
    });
  } catch (error) {
    console.error("Get mails error:", error);
    res.status(500).json({ message: "Server error" });
  }
};