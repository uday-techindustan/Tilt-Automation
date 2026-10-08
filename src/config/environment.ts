const defaultPdpUrls = [
  'https://tiltprotein.com/products/chocolate-sea-salt',
  'https://tiltprotein.com/products/vanilla-almond',
];

const pdpUrlsFromEnv = (process.env.PDP_URLS || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const environment = {
  baseUrl: process.env.BASE_URL || 'https://tiltprotein.com',
  pdpUrls: pdpUrlsFromEnv.length > 0 ? pdpUrlsFromEnv : defaultPdpUrls,
  pdpUrl:
    process.env.PDP_URL ||
    pdpUrlsFromEnv[0] ||
    defaultPdpUrls[0],
};
