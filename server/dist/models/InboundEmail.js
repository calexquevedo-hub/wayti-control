import mongoose, { Schema } from "mongoose";
const InboundEmailSchema = new Schema({
    messageId: { type: String, required: true, unique: true },
    threadKey: { type: String, required: true },
    from: { type: String, required: true },
    subject: { type: String, required: true },
    receivedAt: { type: Date, required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    rawSnippet: { type: String },
    textBody: { type: String },
    htmlBody: { type: String },
    headers: { type: Object },
    attachments: [
        new Schema({
            filename: { type: String },
            contentType: { type: String },
            size: { type: Number },
            path: { type: String },
        }, { _id: false }),
    ],
}, { timestamps: true });
export const InboundEmailModel = mongoose.model("InboundEmail", InboundEmailSchema);
