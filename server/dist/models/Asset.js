import mongoose, { Schema } from "mongoose";
const AssignmentHistorySchema = new Schema({
    at: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },
    notes: { type: String },
}, { _id: false });
const AssetSchema = new Schema({
    tag: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    serialNumber: { type: String },
    type: {
        type: String,
        enum: ["Hardware", "Software", "License", "Peripheral", "Mobile"],
        required: true,
    },
    brand: { type: String },
    model: { type: String },
    purchaseDate: { type: Date },
    purchaseValue: { type: Number },
    warrantyExpiresAt: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
        type: String,
        enum: ["InUse", "InStock", "Maintenance", "Retired", "Lost"],
        default: "InUse",
    },
    location: { type: String },
    assignmentHistory: [AssignmentHistorySchema],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        versionKey: false,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
        },
    },
});
export const AssetModel = mongoose.model("Asset", AssetSchema);
