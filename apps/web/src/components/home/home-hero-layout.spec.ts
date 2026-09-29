import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { homeHeroHeadingClass, homeHeroSectionClass, homeHeroSupportClass } from './home-hero-layout';

describe('homeHeroSectionClass', () => {
  it('does not clip the headline with overflow-hidden on the section', () => {
    assert.equal(homeHeroSectionClass().includes('overflow-hidden'), false);
  });
});

describe('homeHeroHeadingClass', () => {
  it('uses the Sinhala font, wrapping, and relaxed leading for locale=si', () => {
    const cls = homeHeroHeadingClass('si');
    assert.equal(cls.includes('--font-si'), true);
    assert.equal(cls.includes('break-words'), true);
    assert.equal(cls.includes('leading-[1.02]'), false);
    assert.equal(cls.includes('xl:text-[5rem]'), false);
  });

  it('caps English headline size on small screens', () => {
    const cls = homeHeroHeadingClass('en');
    assert.equal(cls.includes('text-[3.15rem]'), false);
    assert.equal(cls.includes('leading-[1.02]'), false);
    assert.match(cls, /text-\[2\.\d+rem\]|text-4xl/);
  });

  it('lets the support line wrap inside a narrow column', () => {
    const cls = homeHeroSupportClass();
    assert.equal(cls.includes('w-full'), true);
    assert.equal(cls.includes('min-w-0'), true);
  });
});
