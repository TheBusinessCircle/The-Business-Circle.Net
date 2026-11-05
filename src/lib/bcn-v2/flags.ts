/** Deployment isolation. Never enable on the independent product's deployment. */
export function isBcnV2Enabled() {
  if (process.env.BCN_V2_ENABLED !== "true") return false;
  const deploymentUrls = [process.env.APP_URL, process.env.NEXTAUTH_URL].filter(
    (url): url is string => Boolean(url),
  );
  if (deploymentUrls.length === 0) return false;
  try {
    return deploymentUrls.every((value) => {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        url.hostname !== "circlecard.co.uk" &&
        !url.hostname.endsWith(".circlecard.co.uk")
      );
    });
  } catch {
    return false;
  }
}

export function isBcnHiddenProductPath(path: string) {
  path = path.split(/[?#]/, 1)[0];
  return /^\/(circle-card|card|admin\/circle-card|dashboard\/circle-card|uploads\/circle-card)(\/|$)/i.test(
    path,
  );
}
