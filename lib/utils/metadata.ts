import type { Metadata } from 'next';

interface PageMetadataOptions {
  /** Page title (will be appended with " - Bombers Bar") */
  title: string;
  /** Page description for SEO and social sharing */
  description: string;
  /** Optional custom image path (defaults to /logo.png) */
  image?: string;
  /** Optional custom image dimensions */
  imageWidth?: number;
  imageHeight?: number;
}

/**
 * Generate consistent metadata for pages with social sharing tags
 *
 * Provides DRY metadata generation with Bombers Bar branding
 * Includes Open Graph and Twitter Card tags
 *
 * @example
 * export const metadata = generatePageMetadata({
 *   title: 'Ship Replacement Program',
 *   description: 'View and manage SRP requests for fleet losses'
 * });
 */
export function generatePageMetadata(options: PageMetadataOptions): Metadata {
  const {
    title,
    description,
    image = '/logo.png',
    imageWidth = 512,
    imageHeight = 512,
  } = options;

  const fullTitle = `${title} - Bombers Bar`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      images: [
        {
          url: image,
          width: imageWidth,
          height: imageHeight,
          alt: 'Bombers Bar Logo',
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description,
      images: [image],
    },
  };
}
