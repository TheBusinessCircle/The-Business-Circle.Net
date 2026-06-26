export type CircleCardSaveActionState = {
  success: boolean;
  message: string;
  cardId?: string;
  slug?: string;
  publicUrl?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
  submittedAt?: number;
};

export const initialCircleCardSaveActionState: CircleCardSaveActionState = {
  success: false,
  message: ""
};
