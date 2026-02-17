import mongoose, { Schema } from "mongoose";
const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    profile: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    pendingEmail: { type: String },
    emailChangeCodeHash: { type: String },
    emailChangeExpiresAt: { type: Date },
    locale: { type: String, default: "pt-BR" },
    theme: { type: String, enum: ["light", "dark"], default: "dark" },
    notificationPrefs: {
        email: { type: Boolean, default: true },
        slack: { type: Boolean, default: true },
    },
}, { timestamps: true });
UserSchema.set("toJSON", {
    versionKey: false,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
    },
});
export const UserModel = mongoose.model("User", UserSchema);
