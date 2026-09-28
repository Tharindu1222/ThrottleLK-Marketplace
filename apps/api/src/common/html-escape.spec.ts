import { escapeHtml } from './html-escape';

describe('escapeHtml', () => {
  it('neutralizes markup in listing titles', () => {
    expect(escapeHtml('Honda <img onerror=alert(1)>')).toBe(
      'Honda &lt;img onerror=alert(1)&gt;',
    );
  });
});
