# Admin category cover images

**Date:** 2026-09-12  
**Status:** Approved for implementation  
**Scope:** Taxonomy admin upload for the 6 public homepage category covers

## Approach
- Nullable `coverStorageKey` + `coverImageUrl` on `Category`
- Admin upload/replace/delete (max 1), R2 via existing StorageService
- Taxonomy page: Categories cover section
- Homepage merges API cover URL by slug; SVG fallback

## Non-goals
- Category rename/CRUD beyond cover
- Multi-image galleries
