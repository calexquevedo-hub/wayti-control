import mongoose, { Schema, type Document } from "mongoose";

export const SPRINT_STATUSES = ["Planned", "Active", "Closed"] as const;

export interface ISprint extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  status: (typeof SPRINT_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

const SprintSchema = new Schema<ISprint>(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    status: { type: String, enum: SPRINT_STATUSES, default: "Planned", index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
  }
);

export const SprintModel = mongoose.model<ISprint>("Sprint", SprintSchema);
