---
name: Social Variants API Implementation
description: Successfully implemented social variants API endpoints with database schema support
type: project
---

Social variants API implementation completed:

1. **Created database migration** (0003_add_variants_support.sql) to add:
   - variant_of column (references links.id)
   - variant_suffix column
   - variant_generations table for tracking

2. **Updated shared constants** with:
   - SOCIAL_VARIANT_SUFFIX_MAP: { instagram: '-ig', facebook: '-fb', twitter: '-x', tiktok: '-tt', linkedin: '-li' }
   - SOCIAL_PLATFORM_UTM_SOURCE_MAP for platform-specific UTM tags

3. **Implemented API endpoints**:
   - POST /api/links/{id}/variants - Generates 5 social variants from base link
   - PATCH /api/links/{id}/variants - Bulk updates all variant destinations
   - Both track variant relationships and update destination history

4. **Key features**:
   - Variants inherit destination from base link (applied at redirect time)
   - Platform-specific UTM tags applied during redirect
   - Skips generation if variants already exist
   - Skips updates if destination unchanged
   - Records all changes in destination_history

**Files created**:
- /migrations/0003_add_variants_support.sql
- /packages/shared/src/constants.ts (updated)
- /admin/functions/api/links/[id]/variants/index.ts
- /admin/functions/api/links/[id]/variants/variants.ts
- /admin/functions/api/schema.ts (updated)
- /admin/functions/api/db.ts (updated)

**Tests created** but currently failing due to build configuration issues. Need to resolve path resolution in vitest config.