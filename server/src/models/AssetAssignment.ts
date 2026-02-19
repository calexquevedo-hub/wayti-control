import mongoose, { Schema, type Document, type Types } from "mongoose";

export const ASSET_ASSIGNMENT_STATUSES = ["Active", "Returned"] as const;

interface IAssignmentSnapshot {
  name: string;
  cpf: string;
}

export interface IAssetAssignment extends Document {
  asset: Types.ObjectId;
  user?: Types.ObjectId | null;
  snapshot: IAssignmentSnapshot;
  checkoutDate: Date;
  checkoutCondition?: string;
  expectedReturnDate?: Date;
  checkinDate?: Date | null;
  checkinCondition?: string;
  status: (typeof ASSET_ASSIGNMENT_STATUSES)[number];
  notes?: string;
  signedTermUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSnapshotSchema = new Schema<IAssignmentSnapshot>(
  {
    name: { type: String, required: true, trim: true },
    cpf: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const AssetAssignmentSchema = new Schema<IAssetAssignment>(
  {
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    snapshot: { type: AssignmentSnapshotSchema, required: true },
    checkoutDate: { type: Date, required: true, default: Date.now },
    checkoutCondition: { type: String, trim: true },
    expectedReturnDate: { type: Date },
    checkinDate: { type: Date, default: null },
    checkinCondition: { type: String, trim: true },
    status: { type: String, enum: ASSET_ASSIGNMENT_STATUSES, default: "Active", index: true },
    notes: { type: String, trim: true },
    signedTermUrl: { type: String, trim: true },
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

export const AssetAssignmentModel = mongoose.model<IAssetAssignment>(
  "AssetAssignment",
  AssetAssignmentSchema
);
