import mongoose, { Schema } from "mongoose";

const ContactLogSchema = new Schema(
  {
    demandId: { type: Schema.Types.ObjectId, ref: "Demand", required: true },
    at: { type: Date, required: true },
    channel: { type: String, required: true },
    summary: { type: String, required: true },
    nextFollowUpAt: { type: Date },
  },
  { timestamps: true }
);

export const ContactLogModel = mongoose.model("ContactLog", ContactLogSchema);
