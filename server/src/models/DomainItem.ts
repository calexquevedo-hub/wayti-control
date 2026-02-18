import mongoose, { Schema } from "mongoose";

export const DOMAIN_TYPES = ["CATEGORY", "EPIC"] as const;

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DomainItemSchema = new Schema(
  {
    type: { type: String, enum: DOMAIN_TYPES, required: true, index: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    color: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
  }
);

DomainItemSchema.index({ type: 1, value: 1 }, { unique: true });

DomainItemSchema.pre("validate", function (next) {
  const doc = this as any;
  if (!doc.value && doc.label) {
    doc.value = slugify(doc.label);
  } else if (doc.value) {
    doc.value = slugify(doc.value);
  }
  next();
});

export const DomainItemModel = mongoose.model("DomainItem", DomainItemSchema);
