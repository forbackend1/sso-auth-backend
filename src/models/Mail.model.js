import mongoose from "mongoose";

const mailSchema = new mongoose.Schema(
  {
    // 🔗 Reference to User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Email fields
    to: {
      type: String,
      required: true,
      index: true,
    },

    from: {
      type: String,
    },

    subject: {
      type: String,
      default: "(no subject)",
    },

    text: {
      type: String,
    },

    html: {
      type: String,
    },

    messageId: {
      type: String,
      unique: true,
      index: true,
    },

    date: {
      type: Date,
    },

    attachments: [
      {
        filename: String,
        contentType: String,
        size: Number,
        path: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Mail = mongoose.model("Mail", mailSchema);