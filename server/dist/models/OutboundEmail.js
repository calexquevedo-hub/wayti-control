import mongoose, { Schema } from "mongoose";
const OutboundEmailSchema = new Schema({
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    cc: { type: String },
    bcc: { type: String },
    subject: { type: String, required: true },
    bodySnippet: { type: String },
    bodyText: { type: String },
    bodyHtml: { type: String },
    headers: { type: Object },
    messageId: { type: String },
    response: { type: String },
    attachments: [
        new Schema({
            filename: { type: String },
            contentType: { type: String },
            size: { type: Number },
            path: { type: String },
        }, { _id: false }),
    ],
    sentAt: { type: Date, required: true },
    status: { type: String, default: "sent" },
    errorMessage: { type: String },
}, { timestamps: true });
export const OutboundEmailModel = mongoose.model("OutboundEmail", OutboundEmailSchema);
