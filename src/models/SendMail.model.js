// models/SendMail.model.js
import mongoose from "mongoose";

const sendMailSchema = new mongoose.Schema(
    {
        senderUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        from: {
            type: String,
            required: true, // user@slvai.tech
        },

        to: {
            type: String,
            required: true,
            index: true,
        },

        subject: {
            type: String,
            default: "(no subject)",
        },

        text: String,
        html: String,

        status: {
            type: String,
            enum: ["sent", "failed"],
            default: "sent",
        },

        error: String,
    },
    { timestamps: true }
);

export const SendMail = mongoose.model("SendMail", sendMailSchema);