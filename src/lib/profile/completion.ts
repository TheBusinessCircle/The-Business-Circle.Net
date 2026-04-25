export type ProfileCompletionInput = {
  name?: string | null;
  bio?: string | null;
  location?: string | null;
  experience?: string | null;
  companyName?: string | null;
  businessDescription?: string | null;
  industry?: string | null;
  services?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  customLinks?: string[] | null;
  collaborationNeeds?: string | null;
  collaborationOffers?: string | null;
  partnershipInterests?: string | null;
  acceptedRulesAt?: Date | string | null;
};

export type ProfileCompletionFieldKey =
  | "name"
  | "bio"
  | "location"
  | "experience"
  | "companyName"
  | "businessDescription"
  | "industry"
  | "services"
  | "website"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "customLinks"
  | "collaborationNeeds"
  | "collaborationOffers"
  | "partnershipInterests"
  | "acceptedRules";

export type ProfileCompletionField = {
  key: ProfileCompletionFieldKey;
  label: string;
  complete: boolean;
};

export type ProfileCompletionResult = {
  percentage: number;
  completedCount: number;
  totalCount: number;
  fields: ProfileCompletionField[];
};

const PROFILE_COMPLETION_FIELDS: Array<{ key: ProfileCompletionFieldKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "bio", label: "Bio" },
  { key: "location", label: "Location" },
  { key: "experience", label: "Experience" },
  { key: "companyName", label: "Company" },
  { key: "businessDescription", label: "Business Description" },
  { key: "industry", label: "Industry" },
  { key: "services", label: "Services" },
  { key: "website", label: "Website" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "customLinks", label: "Other Links" },
  { key: "collaborationNeeds", label: "Need Help With" },
  { key: "collaborationOffers", label: "Can Help With" },
  { key: "partnershipInterests", label: "Partnership Interests" },
  { key: "acceptedRules", label: "BCN Rules Acceptance" }
];

function hasContent(value: string | string[] | null | undefined): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => item.trim().length > 0);
  }

  return Boolean(value && value.trim().length);
}

export function getProfileCompletion(input: ProfileCompletionInput): ProfileCompletionResult {
  const fields = PROFILE_COMPLETION_FIELDS.map((field) => ({
    ...field,
    complete:
      field.key === "acceptedRules"
        ? Boolean(input.acceptedRulesAt)
        : hasContent(input[field.key])
  }));
  const completedCount = fields.filter((field) => field.complete).length;
  const totalCount = fields.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    percentage,
    completedCount,
    totalCount,
    fields
  };
}
