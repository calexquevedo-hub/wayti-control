import mongoose, { Schema, Document } from "mongoose";

export interface IAutomationRule extends Document {
  title: string;
  isActive: boolean;
  trigger: "TicketCreated" | "TicketUpdated";
  conditions: Array<{
    field: string;
    operator: "equals" | "not_equals" | "contains" | "greater_than";
    value: string;
  }>;
  actions: Array<{
    type: "SendEmail" | "UpdateTicket" | "AssignAgent";
    params: Record<string, any>;
  }>;
}

const AutomationRuleSchema = new Schema<IAutomationRule>(
  {
    title: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    trigger: { type: String, enum: ["TicketCreated", "TicketUpdated"], required: true },
    conditions: [
      {
        field: { type: String, required: true },
        operator: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    actions: [
      {
        type: { type: String, required: true },
        params: { type: Map, of: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true }
);

export const AutomationRuleModel = mongoose.model<IAutomationRule>("AutomationRule", AutomationRuleSchema);
