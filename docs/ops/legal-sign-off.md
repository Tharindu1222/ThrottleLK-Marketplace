# Legal copy sign-off

ThrottleLK ships Terms, Privacy, and Rules as **product copy**. They are not a
signed contract until counsel and the owner both record a review.

## Status in the product

- Default: pages show `legalReviewPending`.
- After sign-off: set `NEXT_PUBLIC_LEGAL_REVIEW_SIGNED=true` and rebuild web.

This flag does **not** replace a lawyer. It only records that the owner treated
the current text as reviewed.

## Checklist (owner)

- [ ] Terms of use reviewed against actual marketplace behaviour (listings, messages, promotions)
- [ ] Privacy policy reviewed against stored PII (email, phone, IP, cookies)
- [ ] Cookie notice matches HttpOnly session cookies + optional GA4 / Clarity
- [ ] Rules / prohibited listings match moderation practice
- [ ] Counsel review date: __________
- [ ] Owner sign-off date: __________
- [ ] `NEXT_PUBLIC_LEGAL_REVIEW_SIGNED=true` deployed only after the dates above
