import { starting } from "./01-starting";
import { customers } from "./02-customers";
import { pricing } from "./03-pricing";
import { cash } from "./04-cash";
import { websites } from "./05-websites";
import { marketing } from "./06-marketing";
import { help } from "./07-help";
import { buying } from "./08-buying";
import { delivery } from "./09-delivery";
import { growth } from "./10-growth";
import { resilience } from "./11-resilience";
import { yourWay } from "./12-your-way";
import { review } from "./13-review";
import type { BcnBlogDraft } from "./types";

// Rotate topics rather than spending whole months on just one business stage.
const groups = [
  starting,
  customers,
  pricing,
  cash,
  websites,
  marketing,
  help,
  buying,
  delivery,
  growth,
  resilience,
  yourWay,
  review,
];
export const BCN_BLOG_DRAFTS: BcnBlogDraft[] = Array.from(
  { length: 8 },
  (_, index) => groups.map((group) => group[index]),
).flat();
export { BLOG_PREPARED_AT, BLOG_SOURCES } from "./types";
