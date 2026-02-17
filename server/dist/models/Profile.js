import mongoose, { Schema } from "mongoose";
const ProfileSchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    isSystem: { type: Boolean, default: false },
    permissions: {
        tickets: {
            view: { type: Boolean, default: true },
            create: { type: Boolean, default: true },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
        },
        demands: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
        },
        assets: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
        },
        contracts: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
        },
        users: {
            view: { type: Boolean, default: false },
            manage: { type: Boolean, default: false },
        },
        reports: {
            view: { type: Boolean, default: false },
        },
        settings: {
            manage: { type: Boolean, default: false },
        },
    },
}, { timestamps: true });
export const ProfileModel = mongoose.model("Profile", ProfileSchema);
