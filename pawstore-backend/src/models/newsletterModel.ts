import mongoose, { Document, Schema } from "mongoose";

export interface INewsletter extends Document {
  email: string;
  status: "active" | "unsubscribed";
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "unsubscribed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const Newsletter = mongoose.model<INewsletter>("Newsletter", newsletterSchema);

export default Newsletter;
