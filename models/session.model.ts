import mongoose, { Schema, type Document } from "mongoose";

interface SessionDoc extends Document {
  sessionId: string;
  // @ts-ignore
  creds: any;
  // @ts-ignore
  keys: any;
}

const sessionSchema = new Schema<SessionDoc>({
  sessionId: { type: String, required: true, unique: true },
  creds: { type: Object, required: true },
  keys: { type: Object, required: true },
});

export const SessionModel = mongoose.model<SessionDoc>(
  "Session",
  sessionSchema
);
