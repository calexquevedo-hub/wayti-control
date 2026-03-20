import mongoose, { Schema, type Document } from "mongoose";

export interface ISprintCloseout extends Document {
  sprintId: mongoose.Types.ObjectId;
  closedAt: Date;
  closedBy: String;
  totals: {
    planned: number;
    completed: number;
    notCompleted: number;
    carryoverMoved: number;
    backlogReturned: number;
    canceled: number;
  };
  carryoverRate: number;
  carryoverCriticalCount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SprintCloseoutSchema = new Schema<ISprintCloseout>(
  {
    sprintId: { type: Schema.Types.ObjectId, ref: "Sprint", required: true, index: true },
    closedAt: { type: Date, default: Date.now },
    closedBy: { type: String, required: true },
    totals: {
      planned: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      notCompleted: { type: Number, default: 0 },
      carryoverMoved: { type: Number, default: 0 },
      backlogReturned: { type: Number, default: 0 },
      canceled: { type: Number, default: 0 },
    },
    carryoverRate: { type: Number, default: 0 },
    carryoverCriticalCount: { type: Number, default: 0 },
    notes: { type: String },
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

export const SprintCloseoutModel = mongoose.model<ISprintCloseout>("SprintCloseout", SprintCloseoutSchema);
