export type CircleCardReportActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const CIRCLE_CARD_REPORT_IDLE_STATE: CircleCardReportActionState = {
  status: "idle",
  message: ""
};
