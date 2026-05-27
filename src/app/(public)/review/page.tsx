import type { Metadata } from "next";
import { PublicTestimonialExperience } from "@/components/testimonials/public-testimonial-experience";
import { createPageMetadata } from "@/lib/seo";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Leave a Review",
  description: "Leave a quick testimonial or review for The Business Circle Network.",
  path: "/review"
});

export default async function ReviewPage(props: PageProps) {
  return PublicTestimonialExperience({
    ...props,
    formReturnPath: "/review"
  });
}
