import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScrapperX - Free Web Scraping API | Extract Content to Markdown",
  description: "Free, open-source web scraping API for extracting content from any website. Convert URLs to clean markdown output. Quick scrape, batch scrape, and domain crawling with intelligent extraction.",
  keywords: "web scraping, API, markdown, content extraction, crawler, scraper, data extraction, web crawler, content scraper, markdown converter",
  authors: [{ name: "ScrapperX Team" }],
  creator: "ScrapperX",
  publisher: "ScrapperX",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://scrapperx.run.place'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://scrapperx.run.place',
    title: 'ScrapperX - Free Web Scraping API | Extract Content to Markdown',
    description: 'Free, open-source web scraping API for extracting content from any website. Convert URLs to clean markdown output with intelligent extraction.',
    siteName: 'ScrapperX',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ScrapperX - Web Scraping API',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScrapperX - Free Web Scraping API',
    description: 'Free, open-source web scraping API for extracting content from any website. Convert URLs to clean markdown output.',
    images: ['/og-image.png'],
    creator: '@scrapperx',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "ScrapperX",
    "description": "Free, open-source web scraping API for extracting content from any website. Convert URLs to clean markdown output with intelligent extraction.",
    "url": "https://scrapperx.run.place",
    "applicationCategory": "WebApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Quick Scrape - Single URL to markdown",
      "Batch Scrape - Multiple URLs at once",
      "Domain Crawler - Crawl entire websites",
      "Intelligent extraction",
      "No authentication required",
      "Markdown output format"
    ],
    "author": {
      "@type": "Organization",
      "name": "ScrapperX Team"
    },
    "potentialAction": {
      "@type": "UseAction",
      "target": "https://scrapperx.run.place",
      "description": "Start scraping websites with ScrapperX API"
    }
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
