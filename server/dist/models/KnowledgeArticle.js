import mongoose, { Schema } from "mongoose";
const KnowledgeArticleSchema = new Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    tags: [{ type: String }],
    views: { type: Number, default: 0 },
    helpfulVotes: { type: Number, default: 0 },
    relatedServiceId: { type: Schema.Types.ObjectId, ref: "ServiceCatalog" },
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
export const KnowledgeArticleModel = mongoose.model("KnowledgeArticle", KnowledgeArticleSchema);
