import mongoose, { Schema, Document } from "mongoose";

export interface IProfile extends Document {
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: {
    tickets: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    demands: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    assets: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    contracts: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    users: { view: boolean; manage: boolean };
    reports: { view: boolean };
    settings: { manage: boolean };
  };
}

const ProfileSchema = new Schema(
  {
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
  },
  { timestamps: true }
);

export const ProfileModel = mongoose.model<IProfile>("Profile", ProfileSchema);
