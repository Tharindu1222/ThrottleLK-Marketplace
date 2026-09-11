export type Guide = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  body: string[];
};

export const guides: Guide[] = [
  {
    slug: 'buying-used-motorcycle-sri-lanka',
    title: 'How to buy a used motorcycle in Sri Lanka',
    description:
      'A practical checklist for inspecting papers, mileage, and price before you pay.',
    publishedAt: '2026-09-01',
    body: [
      'Buying a used bike in Sri Lanka is still mostly done over phone and WhatsApp. ThrottleLK is built to make that search clearer — but you still need to verify the machine in person.',
      'Start with papers: registration book, revenue license, and insurance. Match the chassis and engine numbers to the book. If anything looks altered, walk away.',
      'Check service history if available, look for accident repairs around the frame and forks, and take a short test ride on familiar roads.',
      'Compare similar listings by brand, model, year, and district before you negotiate. A fair price is usually within the cluster of recent comparable ads.',
    ],
  },
  {
    slug: 'scooter-vs-commuter',
    title: 'Scooter vs commuter bike: which fits Colombo traffic?',
    description:
      'Trade-offs between automatic scooters and light commuter motorcycles for daily Sri Lankan riding.',
    publishedAt: '2026-09-05',
    body: [
      'Scooters win on stop-go traffic comfort and storage. Commuters usually offer better highway stability and fuel efficiency at higher speeds.',
      'If most of your riding is short city trips under 20 km, a 110–125cc scooter is often enough. For mixed city and outstation use, a 125–150cc commuter is more flexible.',
      'On ThrottleLK, filter by category and engine size, then compare listings side-by-side before contacting sellers.',
    ],
  },
  {
    slug: 'selling-your-bike-fast',
    title: 'How to sell your bike faster on ThrottleLK',
    description:
      'Photo tips, honest descriptions, and pricing advice for private sellers and dealers.',
    publishedAt: '2026-09-08',
    body: [
      'Use bright, sharp photos: front, both sides, rear, odometer, and any damage. Buyers skip dark garage shots.',
      'Write a clear title with brand, model, and year. In the description, include mileage, service notes, and whether the price is negotiable.',
      'Price slightly below the tightest comparable active listings if you want speed. Listings still need admin approval before they go public.',
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
