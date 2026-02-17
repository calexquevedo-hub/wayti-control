import mongoose, { Schema } from "mongoose";
const VaultItemSchema = new Schema({
    title: { type: String, required: true },
    username: { type: String, required: true },
    url: { type: String },
    tags: [{ type: String }],
    externalOwnerId: { type: Schema.Types.ObjectId, ref: "ExternalParty" },
    passwordEnc: { type: String, required: true },
    passwordIv: { type: String, required: true },
    passwordTag: { type: String, required: true },
    notesEnc: { type: String },
    notesIv: { type: String },
    notesTag: { type: String },
    lastRotatedAt: { type: Date },
    rotationPeriodDays: { type: Number },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        versionKey: false,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.passwordEnc;
            delete ret.passwordIv;
            delete ret.passwordTag;
            delete ret.notesEnc;
            delete ret.notesIv;
            delete ret.notesTag;
        },
    },
});
export const VaultItemModel = mongoose.model("VaultItem", VaultItemSchema);
