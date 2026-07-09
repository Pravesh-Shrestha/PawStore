import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  timestamp: Date;
  level: "INFO" | "WARN" | "ERROR" | "SECURITY";
  action: string;
  userId: string;
  userName: string;
  userEmail: string;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  statusCode: number;
  duration: string;
  details: Record<string, any>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    level: {
      type: String,
      enum: ["INFO", "WARN", "ERROR", "SECURITY"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      default: "anonymous",
      index: true,
    },
    userName: {
      type: String,
      default: "",
    },
    userEmail: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
      default: "unknown",
    },
    userAgent: {
      type: String,
      default: "unknown",
    },
    method: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      default: "",
    },
    statusCode: {
      type: Number,
      default: 0,
    },
    duration: {
      type: String,
      default: "",
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ level: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;
