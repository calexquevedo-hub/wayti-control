import mongoose, { Schema, Document } from "mongoose";

export interface INextStepItem extends Document {
  order: number;
  title: string;
  priorityColor: "red" | "yellow" | "green";
  responsible: string;
  dueLabel: string;
  dependencies: string[];
  linkedEpicValue?: string;
  linkedSprintId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NextStepItemSchema = new Schema<INextStepItem>(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    priorityColor: { type: String, enum: ["red", "yellow", "green"], default: "green" },
    responsible: { type: String, trim: true },
    dueLabel: { type: String, trim: true },
    dependencies: [{ type: String, trim: true }],
    linkedEpicValue: { type: String, trim: true },
    linkedSprintId: { type: Schema.Types.ObjectId, ref: "Sprint" },
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

export const NextStepItemModel = mongoose.model<INextStepItem>("NextStepItem", NextStepItemSchema);
