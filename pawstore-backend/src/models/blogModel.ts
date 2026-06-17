import mongoose, { Document, Schema } from "mongoose";

export interface IBlog extends Document {
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: Date;
  author: string;
  category: "training" | "health" | "nutrition" | "behavior";
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    author: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["training", "health", "nutrition", "behavior"],
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Blog = mongoose.model<IBlog>("Blog", blogSchema);

export default Blog;
