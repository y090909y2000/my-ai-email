import mongoose, { InferSchemaType, Model } from "mongoose";

// 每次寄信成功後存一筆：寄信資訊 + 當天晨報的完整資料
const sentEmailSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    resendId: { type: String },
    brief: { type: mongoose.Schema.Types.Mixed, required: true }, // date、AI summary、raw
  },
  { timestamps: true }, // 自動產生 createdAt / updatedAt
);

export type SentEmailDoc = InferSchemaType<typeof sentEmailSchema>;

// 避免 HMR 重複編譯 model
export const SentEmail: Model<SentEmailDoc> =
  mongoose.models.SentEmail ||
  mongoose.model<SentEmailDoc>("SentEmail", sentEmailSchema);
