import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.theexecutivemeditator.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/delete-account`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
