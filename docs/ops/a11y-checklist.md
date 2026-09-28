# Accessibility launch checklist (WCAG 2.2 AA target)

This is an operator checklist, not a certified audit. Re-run after major UI work.

## Keyboard and structure

- [ ] Skip link is first focusable control and moves focus to `#main-content`
- [ ] Primary nav, filters, and sell form can be completed with keyboard only
- [ ] Focus is visible on links, buttons, inputs, and selects
- [ ] Modals and chat drawers trap focus and restore it on close

## Language and text

- [ ] `html lang` is `en` or `si` to match the URL locale
- [ ] Sinhala pages render Noto Sans Sinhala (no tofu for යතුරුපැදි)
- [ ] Errors are text, not colour-only

## Contrast and media

- [ ] Body text vs background ≥ 4.5:1 (accent red on white needs a check)
- [ ] Listing images have empty `alt` only when decorative; cards expose the title in text
- [ ] Do not autoplay video/audio

## Automated pass (optional)

```bash
npx @axe-core/cli http://127.0.0.1:3000/en
npx @axe-core/cli http://127.0.0.1:3000/si
```

Record date, pages tested, and open defects before calling WCAG done.
