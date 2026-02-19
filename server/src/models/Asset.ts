import mongoose, { Schema, type Document, type Types } from "mongoose";

export const ASSET_TYPES = [
  "Computer",
  "Mobile",
  "Peripheral",
  "Infrastructure",
  "Software",
  "Furniture",
  "Other",
] as const;

export const ASSET_STATUSES = ["Available", "In Use", "Maintenance", "Lost", "Retired"] as const;
export const ASSET_CONDITIONS = ["New", "Good", "Fair", "Poor", "Broken"] as const;

export interface IAsset extends Document {
  name: string;
  assetTag?: string;
  serialNumber?: string;
  type: (typeof ASSET_TYPES)[number];
  status: (typeof ASSET_STATUSES)[number];
  condition?: (typeof ASSET_CONDITIONS)[number];
  manufacturer?: string;
  modelName?: string;
  purchaseDate?: Date;
  warrantyEnd?: Date;
  value?: number;
  currentAssignment?: Types.ObjectId | null;
  retireDate?: Date;
  retireReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    name: { type: String, required: true, trim: true },
    assetTag: { type: String, trim: true, unique: true, sparse: true },
    serialNumber: { type: String, trim: true, unique: true, sparse: true },
    type: { type: String, enum: ASSET_TYPES, required: true },
    status: { type: String, enum: ASSET_STATUSES, default: "Available" },
    condition: { type: String, enum: ASSET_CONDITIONS },
    manufacturer: { type: String, trim: true },
    modelName: { type: String, trim: true },
    purchaseDate: { type: Date },
    warrantyEnd: { type: Date },
    value: { type: Number },
    currentAssignment: { type: Schema.Types.ObjectId, ref: "AssetAssignment", default: null },
    retireDate: { type: Date },
    retireReason: { type: String, trim: true },
    notes: { type: String, trim: true },
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

export const AssetModel = mongoose.model<IAsset>("Asset", AssetSchema);
