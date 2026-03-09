import { saveInboundMail } from "../models/InboundMail.save.js";
import logger from "../utils/logger.js";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export const saveMailFromWebhook_resend = async (req, res) => {
    const event = req.body;

    try {
        if (event?.type !== "email.received") {
            return res.status(200).json({ ignored: true });
        }

        const email = event.data;
        // console.log("📦 DATA KEYS:", Object.keys(email));
        // console.log("📨 SUBJECT:", email.subject);
        // console.log("📨 FROM:", email.from);
        // console.log("📨 TO:", email.to);
        // console.log("📨 TEXT:", email.text);
        // console.log("📨 HTML:", email.html);
        // console.log("📨 RAW:", email.raw);
        console.log("----- email -----", email);
        // Step 2: fetch email via Receiving API
        let fetchedEmail = null;
        try {
            const response =
            await resend.emails.receiving.get(email.email_id);
            fetchedEmail = response?.data;
        } catch (err) {
            logger.warn("⚠️ Failed to fetch inbound email from Resend", err);
        }
        console.log("----- fetchedEmail -----", fetchedEmail);

        const mailData = {
            from: email.from,
            to: typeof email.to?.[0] === "string"
                ? email.to[0].toLowerCase()
                : email.to?.[0]?.email?.toLowerCase(),
            subject: email.subject || "(no subject)",
            text: fetchedEmail.text || email.text || "",
            html: fetchedEmail.html || email.html || "",
            messageId: email.message_id,
            date: email.created_at ? new Date(email.created_at) : new Date(),
            attachments: (email.attachments || []).map(att => ({
                filename: att.filename,
                contentType: att.content_type,
                size: att.size,
            })),
        };

        await saveInboundMail(mailData);

        return res.status(200).json({ success: true });
    } catch (err) {
        logger.error("❌ RESEND WEBHOOK ERROR", err);
        return res.status(500).json({ success: false });
    }
};