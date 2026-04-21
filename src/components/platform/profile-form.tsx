"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { MembershipTier } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { MemberRoleBadge } from "@/components/ui/member-role-badge";
import { getMemberRoleDescription, getMemberRoleLabel } from "@/lib/member-role";
import { getProfileCompletion } from "@/lib/profile";
import { profileSchema, type ProfileFormValues } from "@/lib/validators";

type ProfileFormProps = {
  initialValues: ProfileFormValues;
  membershipTier: MembershipTier;
  memberProfileHref: string;
};

const MEMBER_ROLE_OPTIONS: Array<ProfileFormValues["memberRoleTag"]> = [
  "FOUNDER",
  "OPERATOR",
  "ADVISOR"
];
const MIN_PROFILE_IMAGE_DIMENSION = 512;
const RECOMMENDED_PROFILE_IMAGE_DIMENSION = 1024;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-red-300">{message}</p>;
}

async function createProfileImagePreview(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new window.Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight
        });
      };

      image.onerror = () => {
        reject(new Error("invalid-image-file"));
      };

      image.src = objectUrl;
    });

    return {
      objectUrl,
      ...dimensions
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export function ProfileForm({ initialValues, membershipTier, memberProfileHref }: ProfileFormProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedProfileImagePreview, setSelectedProfileImagePreview] = useState<string | null>(null);
  const [selectedProfileImageName, setSelectedProfileImageName] = useState<string | null>(null);
  const [customLinkDraft, setCustomLinkDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const profileImageUploadRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues
  });

  const values = form.watch();
  const customLinkList = useMemo(() => {
    if (!values.customLinks?.trim()) {
      return [] as string[];
    }

    try {
      const parsed = JSON.parse(values.customLinks) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }, [values.customLinks]);
  const previewImage = selectedProfileImagePreview || values.profileImage || undefined;
  const completion = useMemo(
    () =>
      getProfileCompletion({
        name: values.name,
        bio: values.bio,
        location: values.location,
        experience: values.experience,
        companyName: values.companyName,
        businessDescription: values.businessDescription,
        industry: values.industry,
        services: values.services,
        website: values.website,
        instagram: values.instagram,
        linkedin: values.linkedin,
        tiktok: values.tiktok,
        facebook: values.facebook,
        youtube: values.youtube,
        customLinks: customLinkList,
        collaborationNeeds: values.collaborationNeeds,
        collaborationOffers: values.collaborationOffers,
        partnershipInterests: values.partnershipInterests
      }),
    [
      values.bio,
      values.businessDescription,
      values.collaborationNeeds,
      values.collaborationOffers,
      values.companyName,
      customLinkList,
      values.experience,
      values.facebook,
      values.industry,
      values.instagram,
      values.linkedin,
      values.location,
      values.name,
      values.partnershipInterests,
      values.services,
      values.tiktok,
      values.youtube,
      values.website
    ]
  );

  useEffect(() => {
    return () => {
      if (selectedProfileImagePreview) {
        URL.revokeObjectURL(selectedProfileImagePreview);
      }
    };
  }, [selectedProfileImagePreview]);

  const missingFields = completion.fields.filter((field) => !field.complete).slice(0, 5);

  async function handleProfileImageUploadChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];

    if (selectedProfileImagePreview) {
      URL.revokeObjectURL(selectedProfileImagePreview);
    }

    if (!nextFile) {
      setSelectedProfileImagePreview(null);
      setSelectedProfileImageName(null);
      form.clearErrors("profileImage");
      return;
    }

    try {
      const preview = await createProfileImagePreview(nextFile);

      if (
        preview.width < MIN_PROFILE_IMAGE_DIMENSION ||
        preview.height < MIN_PROFILE_IMAGE_DIMENSION
      ) {
        URL.revokeObjectURL(preview.objectUrl);
        if (profileImageUploadRef.current) {
          profileImageUploadRef.current.value = "";
        }
        setSelectedProfileImagePreview(null);
        setSelectedProfileImageName(null);
        form.setError("profileImage", {
          type: "manual",
          message: `Profile image must be at least ${MIN_PROFILE_IMAGE_DIMENSION}x${MIN_PROFILE_IMAGE_DIMENSION}px for a sharp result.`
        });
        return;
      }

      form.clearErrors("profileImage");
      setSelectedProfileImagePreview(preview.objectUrl);
      setSelectedProfileImageName(nextFile.name);
      setNotice(null);
    } catch {
      if (profileImageUploadRef.current) {
        profileImageUploadRef.current.value = "";
      }
      setSelectedProfileImagePreview(null);
      setSelectedProfileImageName(null);
      form.setError("profileImage", {
        type: "manual",
        message: "Profile image must be a valid image file."
      });
    }
  }

  function clearProfileImageUpload() {
    if (selectedProfileImagePreview) {
      URL.revokeObjectURL(selectedProfileImagePreview);
    }

    if (profileImageUploadRef.current) {
      profileImageUploadRef.current.value = "";
    }

    setSelectedProfileImagePreview(null);
    setSelectedProfileImageName(null);
    form.clearErrors("profileImage");
  }

  function addCustomLink() {
    const trimmedDraft = customLinkDraft.trim();
    if (!trimmedDraft) {
      return;
    }

    let normalizedLink: string;

    try {
      normalizedLink = new URL(trimmedDraft).toString();
    } catch {
      form.setError("customLinks", {
        type: "manual",
        message: "Add a full link starting with https://"
      });
      return;
    }

    if (customLinkList.includes(normalizedLink)) {
      form.setError("customLinks", {
        type: "manual",
        message: "That link has already been published."
      });
      return;
    }

    const nextLinks = [...customLinkList, normalizedLink];
    form.setValue("customLinks", JSON.stringify(nextLinks), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
    form.clearErrors("customLinks");
    setCustomLinkDraft("");
  }

  function removeCustomLink(linkToRemove: string) {
    const nextLinks = customLinkList.filter((link) => link !== linkToRemove);
    form.setValue("customLinks", JSON.stringify(nextLinks), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
    form.clearErrors("customLinks");
  }

  const onSubmit = form.handleSubmit((submitted) => {
    setNotice(null);

    startTransition(async () => {
      try {
        const payload = new FormData();
        const entries = Object.entries(submitted) as Array<
          [keyof ProfileFormValues, string | undefined]
        >;

        for (const [key, value] of entries) {
          payload.set(key, value ?? "");
        }

        const selectedImage = profileImageUploadRef.current?.files?.[0];
        if (selectedImage) {
          payload.set("profileImageUpload", selectedImage);
        }

        const response = await fetch("/api/profile", {
          method: "PATCH",
          body: payload
        });

        const responsePayload = (await response.json()) as { error?: string };

        if (!response.ok) {
          setNotice(responsePayload.error ?? "Unable to save profile.");
          return;
        }

        setNotice("Profile updated successfully.");
        router.refresh();
      } catch {
        setNotice("Unable to save profile.");
      }
    });
  });

  return (
    <form className="relative space-y-6" onSubmit={onSubmit}>
      {isPending ? (
        <div className="absolute inset-0 z-20 rounded-2xl border border-gold/30 bg-background/70 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">Saving profile updates...</p>
          <div className="mt-3 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="premium-surface p-5">
            <div className="flex items-center gap-3">
              <Avatar
                className="h-24 w-24"
                name={values.name || "Member"}
                image={previewImage}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{values.name || "Business Circle Member"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <MembershipTierBadge tier={membershipTier} />
                  <MemberRoleBadge roleTag={values.memberRoleTag} />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Profile Completion</span>
                <span>
                  {completion.completedCount}/{completion.totalCount}
                </span>
              </div>
              <div className="h-2 rounded-full bg-background/70">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${completion.percentage}%` }}
                />
              </div>
              <p className="text-sm font-medium text-foreground">{completion.percentage}% complete</p>
              {missingFields.length ? (
                <p className="text-xs text-muted">Next up: {missingFields.map((field) => field.label).join(", ")}</p>
              ) : (
                <p className="text-xs text-muted">Your profile is fully complete.</p>
              )}
            </div>

            <div className="mt-4">
              <Link
                href={memberProfileHref}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View public profile <ArrowUpRight size={12} />
              </Link>
            </div>
          </section>
        </aside>

        <div className="space-y-4">
          <section className="premium-surface p-5">
            <p className="mb-4 text-xs tracking-[0.1em] text-silver uppercase">Identity</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
                <FieldError message={form.formState.errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input id="headline" {...form.register("headline")} placeholder="Founder, strategist, operator" />
                <FieldError message={form.formState.errors.headline?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberRoleTag">Role Tag</Label>
                <Select id="memberRoleTag" {...form.register("memberRoleTag")}>
                  {MEMBER_ROLE_OPTIONS.map((roleTag) => (
                    <option key={roleTag} value={roleTag}>
                      {getMemberRoleLabel(roleTag)}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted">
                  {getMemberRoleDescription(values.memberRoleTag)}
                </p>
                <FieldError message={form.formState.errors.memberRoleTag?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...form.register("location")} placeholder="London, United Kingdom" />
                <FieldError message={form.formState.errors.location?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Input id="experience" {...form.register("experience")} placeholder="8 years building SaaS" />
                <FieldError message={form.formState.errors.experience?.message} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} {...form.register("bio")} placeholder="Share your journey, focus, and goals." />
                <FieldError message={form.formState.errors.bio?.message} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profileImage">Profile Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="profileImage"
                    {...form.register("profileImage")}
                    placeholder="https://images.example.com/avatar.jpg"
                  />
                  <div className="w-[220px]">
                    <Input
                      id="profileImageUpload"
                      type="file"
                      accept="image/*"
                      ref={profileImageUploadRef}
                      onChange={handleProfileImageUploadChange}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Optional: upload an avatar image directly. If selected, the uploaded file will
                  override the URL value on save.
                </p>
                <p className="text-xs text-muted">
                  Best results: use a square image that is at least {RECOMMENDED_PROFILE_IMAGE_DIMENSION}x{RECOMMENDED_PROFILE_IMAGE_DIMENSION}px.
                </p>
                {selectedProfileImageName ? (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="truncate">Selected upload: {selectedProfileImageName}</span>
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={clearProfileImageUpload}
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
                <FieldError message={form.formState.errors.profileImage?.message} />
              </div>
            </div>
          </section>

          <section className="premium-surface p-5">
            <p className="mb-4 text-xs tracking-[0.1em] text-silver uppercase">Business</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company</Label>
                <Input id="companyName" {...form.register("companyName")} />
                <FieldError message={form.formState.errors.companyName?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessStatus">Business Status</Label>
                <Select id="businessStatus" {...form.register("businessStatus")}>
                  <option value="">Select Status</option>
                  <option value="IDEA_STARTUP">Idea / Startup</option>
                  <option value="REGISTERED_BUSINESS">Registered Business</option>
                  <option value="ESTABLISHED_COMPANY">Established Company</option>
                </Select>
                <FieldError message={form.formState.errors.businessStatus?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" {...form.register("industry")} placeholder="Technology, Media, Finance..." />
                <FieldError message={form.formState.errors.industry?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessStage">Business Stage</Label>
                <Select id="businessStage" {...form.register("businessStage")}>
                  <option value="">Select Stage</option>
                  <option value="IDEA">Idea</option>
                  <option value="STARTUP">Startup</option>
                  <option value="GROWTH">Growth</option>
                  <option value="SCALE">Scale</option>
                  <option value="ESTABLISHED">Established</option>
                </Select>
                <FieldError message={form.formState.errors.businessStage?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyNumber">Company Number</Label>
                <Input
                  id="companyNumber"
                  {...form.register("companyNumber")}
                  placeholder="Optional for registered businesses"
                />
                <p className="text-xs text-muted">
                  Useful if the business is registered, not required if it is not.
                </p>
                <FieldError message={form.formState.errors.companyNumber?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="services">Services</Label>
                <Input id="services" {...form.register("services")} placeholder="Coaching, consulting, development..." />
                <FieldError message={form.formState.errors.services?.message} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessDescription">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  rows={4}
                  {...form.register("businessDescription")}
                  placeholder="What your company does and who it serves."
                />
                <FieldError message={form.formState.errors.businessDescription?.message} />
              </div>
            </div>
          </section>

          <section className="premium-surface p-5">
            <p className="mb-4 text-xs tracking-[0.1em] text-silver uppercase">Links & Collaboration</p>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="hidden" {...form.register("customLinks")} />
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" {...form.register("website")} placeholder="https://your-site.com" />
                <FieldError message={form.formState.errors.website?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input id="linkedin" {...form.register("linkedin")} placeholder="https://linkedin.com/in/..." />
                <FieldError message={form.formState.errors.linkedin?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" {...form.register("instagram")} placeholder="https://instagram.com/..." />
                <FieldError message={form.formState.errors.instagram?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input id="tiktok" {...form.register("tiktok")} placeholder="https://www.tiktok.com/@..." />
                <FieldError message={form.formState.errors.tiktok?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" {...form.register("facebook")} placeholder="https://facebook.com/..." />
                <FieldError message={form.formState.errors.facebook?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input id="youtube" {...form.register("youtube")} placeholder="https://youtube.com/@..." />
                <FieldError message={form.formState.errors.youtube?.message} />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="customLinkDraft">Other Links</Label>
                <div className="flex gap-2">
                  <Input
                    id="customLinkDraft"
                    value={customLinkDraft}
                    onChange={(event) => setCustomLinkDraft(event.target.value)}
                    placeholder="https://calendly.com/your-link"
                  />
                  <Button type="button" variant="outline" onClick={addCustomLink}>
                    Publish
                  </Button>
                </div>
                <p className="text-xs text-muted">
                  Add any other public link you want members to see, then publish it into your profile list.
                </p>
                {customLinkList.length ? (
                  <div className="flex flex-wrap gap-2">
                    {customLinkList.map((link) => (
                      <span
                        key={link}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-foreground"
                      >
                        <span className="truncate">{link}</span>
                        <button
                          type="button"
                          className="text-muted hover:text-primary"
                          onClick={() => removeCustomLink(link)}
                          aria-label={`Remove ${link}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No other links published yet.</p>
                )}
                <FieldError message={form.formState.errors.customLinks?.message} />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="collaborationNeeds">What You Need Help With</Label>
                <Textarea id="collaborationNeeds" rows={3} {...form.register("collaborationNeeds")} />
                <FieldError message={form.formState.errors.collaborationNeeds?.message} />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="collaborationOffers">What You Can Help With</Label>
                <Textarea id="collaborationOffers" rows={3} {...form.register("collaborationOffers")} />
                <FieldError message={form.formState.errors.collaborationOffers?.message} />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="partnershipInterests">Partnership Interests</Label>
                <Textarea id="partnershipInterests" rows={3} {...form.register("partnershipInterests")} />
                <FieldError message={form.formState.errors.partnershipInterests?.message} />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="collaborationTags">Collaboration Tags (comma separated)</Label>
                <Input id="collaborationTags" {...form.register("collaborationTags")} placeholder="fundraising, hiring, b2b-sales" />
                <FieldError message={form.formState.errors.collaborationTags?.message} />
              </div>
            </div>
          </section>
        </div>
      </div>

      {notice ? <p className="text-sm text-primary">{notice}</p> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Profile"}
        </Button>
        <Link href={memberProfileHref} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="outline">
            View Public Profile
          </Button>
        </Link>
      </div>
    </form>
  );
}
