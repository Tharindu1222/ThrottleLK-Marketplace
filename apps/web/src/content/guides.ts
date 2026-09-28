import type { Locale } from '@/lib/i18n';

export type Guide = {
  slug: string;
  publishedAt: string;
  title: string;
  description: string;
  body: string[];
  titleSi: string;
  descriptionSi: string;
  bodySi: string[];
};

export const guides: Guide[] = [
  {
    slug: 'buying-used-motorcycle-sri-lanka',
    publishedAt: '2026-09-01',
    title: 'How to buy a used motorcycle in Sri Lanka',
    description:
      'A practical checklist for inspecting papers, mileage, and price before you pay.',
    body: [
      'Buying a used bike in Sri Lanka is still mostly done over phone and WhatsApp. ThrottleLK is built to make that search clearer — but you still need to verify the machine in person.',
      'Start with papers: registration book, revenue license, and insurance. Match the chassis and engine numbers to the book. If anything looks altered, walk away.',
      'Check service history if available, look for accident repairs around the frame and forks, and take a short test ride on familiar roads.',
      'Compare similar listings by brand, model, year, and district before you negotiate. A fair price is usually within the cluster of recent comparable ads.',
    ],
    titleSi: 'ශ්‍රී ලංකාවේ භාවිත මෝටර් සයිකලයක් මිලදී ගන්නේ කෙසේද',
    descriptionSi:
      'ගෙවීමට පෙර ලියාපදිංචි පත්‍ර, කිලෝමීටර් සහ මිල පරීක්ෂා කිරීමේ ප්‍රායෝගික ලැයිස්තුවක්.',
    bodySi: [
      'ශ්‍රී ලංකාවේ භාවිත බයික් මිලදී ගැනීම තවමත් බොහෝ විට දුරකථනයෙන් සහ WhatsApp එකෙන් සිදුවේ. ThrottleLK සෙවුම පැහැදිලි කරයි — නමුත් යන්ත්‍රය පුද්ගලිකව තහවුරු කළ යුතුයි.',
      'ලියාපදිංචි පොත, ආදායම් බලපත්‍රය සහ රක්ෂණයෙන් අරඹන්න. චේසිස් සහ එන්ජින් අංක පොතට ගැලපේද බලන්න. වෙනස් කර ඇති බවක් පෙනේ නම් ඉවත් වන්න.',
      'සේවා ඉතිහාසය තිබේ නම් බලන්න, රාමුව සහ ෆෝක් අවට අනතුරු අලුත්වැඩියා බලන්න, හුරු පාරවල කෙටි රයිඩ් එකක් ගන්න.',
      'සාකච්ඡාවට පෙර බ්‍රෑන්ඩ්, මාදිලිය, වසර සහ දිස්ත්‍රික්කයෙන් සමාන ලැයිස්තු සසඳන්න. සාධාරණ මිලක් සාමාන්‍යයෙන් මෑත සමාන දැන්වීම් කණ්ඩායම තුළ වේ.',
    ],
  },
  {
    slug: 'scooter-vs-commuter',
    publishedAt: '2026-09-05',
    title: 'Scooter vs commuter bike: which fits Colombo traffic?',
    description:
      'Trade-offs between automatic scooters and light commuter motorcycles for daily Sri Lankan riding.',
    body: [
      'Scooters win on stop-go traffic comfort and storage. Commuters usually offer better highway stability and fuel efficiency at higher speeds.',
      'If most of your riding is short city trips under 20 km, a 110–125cc scooter is often enough. For mixed city and outstation use, a 125–150cc commuter is more flexible.',
      'On ThrottleLK, filter by category and engine size, then compare listings side-by-side before contacting sellers.',
    ],
    titleSi: 'ස්කූටර් එකද කොමියුටර් බයික් එකද: කොළඹ තදබදයට මොකද හොඳ?',
    descriptionSi:
      'දෛනික ශ්‍රී ලාංකික ගමනක් සඳහා ස්වයංක්‍රීය ස්කූටර් සහ සැහැල්ලු කොමියුටර් බයික් අතර තේරීම.',
    bodySi: [
      'නවතන-යන තදබදයේ සුවය සහ ගබඩාවේ ස්කූටර් දිනයි. වේගය වැඩි විට කොමියුටර් බයික් අධිවේගී ස්ථාවරත්වය සහ ඉන්ධන කාර්යක්ෂමතාව වැඩියි.',
      'බොහෝ ගමන් කිලෝමීටර් 20ට අඩු නගර චාරිකා නම් 110–125cc ස්කූටර් එකක් බොහෝ විට ප්‍රමාණවත්. නගරය සහ පිටනගර මිශ්‍ර නම් 125–150cc කොමියුටර් එකක් වඩා නම්‍යශීලීයි.',
      'ThrottleLK එකේ කාණ්ඩය සහ එන්ජින් ප්‍රමාණයෙන් පෙරහන් කර, විකුණුම්කරුවන් අමතන්නට පෙර ලැයිස්තු පැත්තකින් සසඳන්න.',
    ],
  },
  {
    slug: 'selling-your-bike-fast',
    publishedAt: '2026-09-08',
    title: 'How to sell your bike faster on ThrottleLK',
    description:
      'Photo tips, honest descriptions, and pricing advice for private sellers and dealers.',
    body: [
      'Use bright, sharp photos: front, both sides, rear, odometer, and any damage. Buyers skip dark garage shots.',
      'Write a clear title with brand, model, and year. In the description, include mileage, service notes, and whether the price is negotiable.',
      'Price slightly below the tightest comparable active listings if you want speed. Listings still need admin approval before they go public.',
    ],
    titleSi: 'ThrottleLK එකේ බයික් එක වේගයෙන් විකුණන්නේ කෙසේද',
    descriptionSi:
      'පෞද්ගලික විකුණුම්කරුවන්ට සහ ඩීලර්වරුන්ට ඡායාරූප, අවංක විස්තර සහ මිල උපදෙස්.',
    bodySi: [
      'එළිය සහිත පැහැදිලි ඡායාරූප භාවිතා කරන්න: ඉදිරිය, දෙපැත්ත, පිටුපස, ඕඩොමීටරය සහ හානි. ගැනුම්කරුවන් අඳුරු ගරාජ ඡායාරූප මග හරිනවා.',
      'බ්‍රෑන්ඩ්, මාදිලිය සහ වසර සහිත පැහැදිලි මාතෘකාවක් ලියන්න. විස්තරයේ කිලෝමීටර්, සේවා සටහන් සහ මිල සාකච්ඡා කළ හැකිද ඇතුළත් කරන්න.',
      'වේගය අවශ්‍ය නම් සමාන ක්‍රියාකාරී ලැයිස්තුවලට වඩා ටිකක් අඩුවෙන් මිල තබන්න. ලැයිස්තු ප්‍රසිද්ධ වීමට පෙර තවමත් පරිපාලක අනුමැතිය අවශ්‍යයි.',
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function guideCopy(guide: Guide, locale: Locale) {
  if (locale === 'si') {
    return {
      title: guide.titleSi,
      description: guide.descriptionSi,
      body: guide.bodySi,
    };
  }
  return {
    title: guide.title,
    description: guide.description,
    body: guide.body,
  };
}
