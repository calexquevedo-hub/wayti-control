import mongoose, { Schema } from "mongoose";
const VaultAuditSchema = new Schema({
    recordId: { type: Schema.Types.ObjectId, ref: "VaultItem", required: true },
    action: {
        type: String,
        enum: ["CREATE", "UPDATE", "DELETE", "VIEW_SECRET", "COPY_SECRET"],
        required: true,
    },
    actorEmail: { type: String, required: true },
    ip: { type: String },
    userAgent: { type: String },
    at: { type: Date, required: true },
}, { timestamps: true });
export const VaultAuditModel = mongoose.model("VaultAudit", VaultAuditSchema);
