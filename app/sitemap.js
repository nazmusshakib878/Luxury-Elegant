const db = require('../src/database/connection');
const { BASE_URL } = require('../src/config/env');

export default async function sitemap() {
  const baseUrl = BASE_URL || 'http://localhost:3000';
  let products = [];
  try {
    products = await db.all('SELECT id FROM products WHERE active = 1');
  } catch {}

  const productUrls = products.map((p) => ({
    url: `${baseUrl}/products/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/track`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...productUrls,
  ];
}
