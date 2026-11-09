/** Bespoke presentation for the owner's existing private prepared card only. */
export const LAWRENCE_SEVERN_SLUG = "lawrence-severn-son-4b134d448659";
export const isLawrenceSevernCard = (card: { slug: string; cardType: string }) =>
  card.slug === LAWRENCE_SEVERN_SLUG && card.cardType === "BUSINESS";

const cloud = "https://res.cloudinary.com/ddaj7fnkd/image/upload/";
// Delivery crops use original pixels. No AI recreation, enhancement or invented details.
// Each crop excludes the screenshot's phone / Facebook / Google interface.
export const lawrencePhotoSources = {
  shopfront: `${cloud}c_crop,x_0,y_410,w_716,h_650/v1793647675/business-circle/circle-card/profile-photo/cmnyohw56000n4pah5mjhr5oz-profile-photo-1793647675307-7c918e17.jpg`,
  counter: `${cloud}c_crop,x_0,y_665,w_716,h_545/v1793647756/business-circle/circle-card/gallery-image/cmnyohw56000n4pah5mjhr5oz-gallery-image-1793647756004-791078ba.jpg`,
  cuts: `${cloud}c_crop,x_0,y_820,w_716,h_620/v1793647775/business-circle/circle-card/gallery-image/cmnyohw56000n4pah5mjhr5oz-gallery-image-1793647774540-dd91c801.jpg`,
  deli: `${cloud}c_crop,x_0,y_990,w_716,h_450/v1793647795/business-circle/circle-card/gallery-image/cmnyohw56000n4pah5mjhr5oz-gallery-image-1793647794759-c7c61c0c.jpg`
} as const;
export const lawrenceFacebook = "https://www.facebook.com/share/19rVMvx7oK/";

export const lawrencePhotos = {
  shopfront: "/circle-card/clients/lawrence-severn/shopfront.jpg",
  counter: "/circle-card/clients/lawrence-severn/counter.jpg",
  cuts: "/circle-card/clients/lawrence-severn/cuts.jpg",
  deli: "/circle-card/clients/lawrence-severn/deli.jpg"
} as const;
