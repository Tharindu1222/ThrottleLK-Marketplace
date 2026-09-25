export type HeroBike = {
  src: string;
  alt: string;
  /** Visual scale so differently framed PNGs read the same size. */
  scale: number;
};

/** Ordered showcase bikes for the homepage radial hero. */
export const HERO_BIKES: HeroBike[] = [
  {
    src: '/images/bike/2a9e1fb6004427a17b8e2c516d97fbe4-removebg-preview.png',
    alt: 'Featured motorbike 1',
    scale: 1,
  },
  {
    src: '/images/bike/6016e8eabbf7647a517e5a5699b47316-removebg-preview.png',
    alt: 'Featured motorbike 2',
    scale: 1.12,
  },
  {
    src: '/images/bike/700a96598a7ccf0f6bb67a5edb773722-removebg-preview.png',
    alt: 'Featured motorbike 3',
    scale: 1.06,
  },
  {
    src: '/images/bike/a6beefccb592373d84b06f48f0ac9dd6-removebg-preview.png',
    alt: 'Featured motorbike 4',
    scale: 1,
  },
  {
    src: '/images/bike/e40602e9510203523cb9415b9669cc79-removebg-preview.png',
    alt: 'Featured motorbike 5',
    scale: 1.04,
  },
];
