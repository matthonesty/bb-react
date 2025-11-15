import { MetadataRoute } from 'next';

/**
 * Generate robots.txt for search engine crawlers
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://bombers.bar';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/srp',
          '/fcs',
          '/doctrines',
          '/bans',
          '/srp-config',
          '/wallet',
          '/mail',
          '/system',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
