# Sri Lanka Bike Marketplace
## Master Product, Technical, SEO, Infrastructure & Development Specification

**Document Type:** Master Project Specification  
**Primary Market:** Sri Lanka  
**Initial Platform:** Responsive Web Application  
**Future Platform:** Mobile Application  
**Architecture Style:** SEO-first, API-first, scalable, stateless  
**Primary Goal:** Build a high-performance, search-engine-optimized motorcycle marketplace for Sri Lanka that can scale from an MVP to hundreds of thousands of listings and large traffic volumes without requiring a full rewrite.

---

# 1. Project Vision

Build a dedicated Sri Lankan motorcycle marketplace where private sellers and dealers can list motorcycles and scooters, while buyers can easily search, filter, compare, save, and contact sellers.

The platform must focus on:

- Excellent Google SEO
- High page speed
- Mobile-first responsive design
- Clean motorcycle-specific search and filtering
- Dealer and private seller support
- Scalable backend architecture
- High listing volume support
- High concurrent traffic support
- Easy migration to a future mobile app
- Low infrastructure cost during the MVP stage
- Ability to scale infrastructure only when traffic grows

The platform will **not initially include**:

- Vehicle valuation
- Physical bike inspection
- Escrow payments
- In-platform vehicle purchase payments
- AI-based damage detection
- Native mobile app
- Advanced machine-learning features

These may be added later only if there is a validated business need.

---

# 2. Core Product Positioning

The platform should be positioned as:

> **A marketplace built specifically for motorcycles and scooters in Sri Lanka.**

The main competitive advantage is not simply allowing users to post advertisements.

The advantage should come from:

- Motorcycle-focused user experience
- Better filters
- Better search
- Cleaner listing pages
- Fast mobile experience
- Dealer showrooms
- Strong SEO
- Strong listing discovery
- Comparison functionality
- Saved listings
- Price-drop tracking
- Better marketplace organization than general classifieds sites

---

# 3. Main User Types

## 3.1 Guest Buyer

Can:

- Browse motorcycles
- Search listings
- Apply filters
- View bike details
- View seller profile
- View dealer profile
- Compare listings
- View related bikes
- Contact seller
- Share listings

Cannot:

- Save favourites permanently
- Save searches
- Create listings
- Manage notifications

---

## 3.2 Registered Buyer

Can:

- Perform all guest actions
- Save favourite motorcycles
- Save searches
- Compare motorcycles
- View recently viewed motorcycles
- Receive price-drop notifications
- Manage profile
- Report suspicious listings
- Manage notification preferences

---

## 3.3 Private Seller

Can:

- Create motorcycle listings
- Upload motorcycle photos
- Edit own listings
- Pause listings
- Mark listings as sold
- Renew expired listings
- View basic listing performance
- Receive buyer contact actions
- Manage seller profile

---

## 3.4 Dealer

Can:

- Create dealer profile
- Add dealer logo
- Add dealer contact information
- Add address and business location
- Create multiple motorcycle listings
- Manage inventory
- Mark motorcycles as sold
- Bulk-manage listings
- View dealer dashboard
- View listing analytics
- Create dealer showroom page
- Purchase featured listing packages in future

---

## 3.5 Administrator

Can manage:

- Users
- Sellers
- Dealers
- Bike brands
- Bike models
- Bike variants
- Listings
- Listing approval
- Listing rejection
- Reports
- Featured listings
- Dealer plans
- Advertisement placements
- SEO landing pages
- Static content
- Blog/guides
- Categories
- Locations
- Site configuration
- Audit logs
- Platform analytics

---

# 4. Main User Journeys

## 4.1 Buyer Journey

```text
Google / Direct Visit
        ↓
Home / Model SEO Page
        ↓
Search / Browse
        ↓
Filter Listings
        ↓
Listing Details
        ↓
Favourite / Compare / Share
        ↓
Seller Profile
        ↓
WhatsApp / Call / Contact
        ↓
Buyer and Seller Complete Deal Outside Platform
```

---

## 4.2 Private Seller Journey

```text
Register
    ↓
Verify Contact Details
    ↓
Create Listing
    ↓
Upload Photos
    ↓
Enter Bike Information
    ↓
Preview Listing
    ↓
Submit for Review
    ↓
Admin Approval
    ↓
Listing Published
    ↓
Buyer Contacts Seller
    ↓
Seller Marks Bike as Sold
```

---

## 4.3 Dealer Journey

```text
Register Dealer Account
        ↓
Complete Dealer Profile
        ↓
Admin Approval
        ↓
Create Listings
        ↓
Manage Inventory
        ↓
Receive Leads
        ↓
Track Listing Performance
        ↓
Renew / Feature Listings
```

---

# 5. Initial Web Application Screens

## 5.1 Public Screens

1. Home
2. Browse All Bikes
3. Search Results
4. Brand Page
5. Model Page
6. Location Page
7. Brand + Model + Location SEO Page
8. Individual Listing Details
9. Seller Profile
10. Dealer Profile
11. Compare Bikes
12. Login
13. Register
14. Forgot Password
15. Reset Password
16. About
17. Contact
18. Terms and Conditions
19. Privacy Policy
20. Safety / Buying Guide
21. Blog / Buying Guides
22. Blog Article
23. 404 Page
24. Sold Listing Page
25. Report Listing Page

---

## 5.2 Buyer Account Screens

1. My Profile
2. Favourites
3. Saved Searches
4. Recently Viewed
5. Compare
6. Notifications
7. Account Settings
8. Security Settings

---

## 5.3 Seller Dashboard Screens

1. Dashboard
2. My Listings
3. Add Listing
4. Edit Listing
5. Listing Performance
6. Sold Listings
7. Expired Listings
8. Profile
9. Notifications
10. Account Settings

---

## 5.4 Dealer Dashboard Screens

1. Dealer Overview
2. Inventory
3. Add Listing
4. Bulk Listing Management
5. Active Listings
6. Sold Listings
7. Expired Listings
8. Listing Analytics
9. Leads
10. Dealer Profile
11. Team Users — Future
12. Subscription / Billing — Future
13. Settings

---

## 5.5 Admin Screens

1. Admin Dashboard
2. Pending Listings
3. Approved Listings
4. Rejected Listings
5. All Listings
6. Users
7. Private Sellers
8. Dealers
9. Dealer Approvals
10. Brands
11. Models
12. Variants
13. Locations
14. Reports
15. Featured Listings
16. SEO Landing Pages
17. Blog
18. Site Content
19. Advertisement Management
20. Audit Logs
21. System Settings
22. Analytics

---

# 6. Listing Data Structure

Each motorcycle listing should support the following.

## 6.1 Core Listing Information

- Listing ID
- Title
- Slug
- Description
- Listing type
- Seller type
- Asking price
- Negotiable status
- Currency
- Listing status
- Publish date
- Expiry date
- Sold date
- Featured status
- Urgent status

---

## 6.2 Motorcycle Information

- Brand
- Model
- Variant
- Motorcycle category
- Manufacture year
- Registration year
- Engine capacity
- Fuel type
- Transmission
- Mileage
- Mileage unit
- Condition
- Colour
- Number of previous owners
- Registration district
- Registration number — optional and masked
- Service history available
- Modification status
- Accident history declaration
- Finance available — seller declaration
- Exchange accepted — seller declaration

---

## 6.3 Location

- Province
- District
- City
- Area
- Latitude — optional
- Longitude — optional

Exact private seller home address must never be publicly exposed.

---

## 6.4 Media

- Cover image
- Additional images
- Optional video URL in future

Recommended limits:

```text
Minimum images: 1
Recommended images: 6–10
Maximum images: 15
```

---

# 7. Motorcycle Categories

Initial categories can include:

- Scooter
- Commuter
- Street / Naked
- Sports
- Cruiser
- Adventure
- Touring
- Dual Sport
- Off-Road
- Electric Motorcycle
- Electric Scooter
- Classic / Vintage
- Other

Category structure must be configurable from Admin.

---

# 8. Search and Filtering

Search is one of the most important modules.

Users must be able to filter by:

- Brand
- Model
- Variant
- Category
- Price minimum
- Price maximum
- Manufacture year
- Registration year
- Mileage
- Engine capacity
- Fuel type
- Transmission
- Province
- District
- City
- Seller type
- Condition
- Negotiable
- Featured listings
- Recently listed

Sorting:

- Newest
- Oldest
- Price Low to High
- Price High to Low
- Mileage Low to High
- Year New to Old
- Most Viewed

---

# 9. SEO Strategy

SEO is a primary system requirement.

The platform must not be built as a client-only SPA.

Use server-rendered or statically generated pages where appropriate.

---

# 10. SEO URL Structure

## 10.1 Main Marketplace

```text
/bikes
```

---

## 10.2 Brand

```text
/bikes/honda
/bikes/yamaha
/bikes/bajaj
```

---

## 10.3 Model

```text
/bikes/honda/hornet-160r
/bikes/yamaha/fz
/bikes/bajaj/pulsar-150
```

---

## 10.4 Location SEO Pages

Only create indexable location combinations with meaningful inventory.

```text
/bikes/honda/hornet-160r/colombo
/bikes/honda/hornet-160r/gampaha
```

Do not generate millions of empty location pages.

---

## 10.5 Listing URL

Example:

```text
/listing/honda-hornet-160r-2019-colombo-102934
```

The numeric or stable unique ID must remain permanent even if the listing title changes.

---

# 11. SEO Page Structure

Each important model page should contain:

```text
H1
Introduction
Available Listings
Current Asking Price Summary
Model Specifications
Popular Locations
Related Models
Helpful Buying Content
FAQ Section
Internal Links
```

Example:

```text
Honda Hornet 160R for Sale in Sri Lanka
```

The page should remain available even when zero listings temporarily exist.

---

# 12. SEO Metadata

Each page must dynamically generate:

- Title
- Meta description
- Canonical URL
- Open Graph title
- Open Graph description
- Open Graph image
- Twitter metadata
- Robots metadata

Example title:

```text
Honda Hornet 160R for Sale in Sri Lanka | BrandName
```

Example description:

```text
Browse Honda Hornet 160R motorcycles currently listed for sale across Sri Lanka. Compare year, mileage, location and seller asking prices.
```

---

# 13. Structured Data

Use valid Schema.org JSON-LD where applicable.

Possible schema:

- Product
- Offer
- BreadcrumbList
- Organization
- WebSite
- Article
- FAQPage only when appropriate
- ItemList where appropriate

Do not add fake review ratings.

Do not add structured data for information that is not visibly present on the page.

---

# 14. Sitemap Strategy

At scale, use a sitemap index.

```text
/sitemap.xml
/sitemaps/sitemap-brands.xml
/sitemaps/sitemap-models-1.xml
/sitemaps/sitemap-models-2.xml
/sitemaps/sitemap-listings-1.xml
/sitemaps/sitemap-listings-2.xml
/sitemaps/sitemap-dealers.xml
/sitemaps/sitemap-guides.xml
```

Only include:

- Canonical URLs
- Published listings
- Valid dealer pages
- Useful SEO pages
- Published blog content

Do not include:

- Login
- Account pages
- Admin pages
- Search filter parameter pages
- Private routes
- Draft listings

---

# 15. Faceted Navigation SEO Rules

Filters can create millions of URL combinations.

Example:

```text
/bikes?brand=honda&year=2020&priceMin=500000&priceMax=800000&sort=latest
```

These should normally not become independent indexable SEO pages.

Recommended approach:

- Allow filters for users
- Canonicalize to the main category/model page
- Use `noindex,follow` where appropriate
- Only expose curated SEO landing pages
- Avoid crawler traps
- Avoid unlimited parameter combinations

---

# 16. Sold Listing SEO

Do not immediately delete sold listings.

When sold:

```text
Status: Sold
```

Page should show:

- Original listing information
- Sold status
- Similar active bikes
- Same model active listings
- Related model links

Only permanently remove the page when legally or operationally necessary.

---

# 17. Blog / Content SEO

Recommended content:

- Best commuter bikes in Sri Lanka
- Honda Hornet buying guide
- Yamaha FZ buying guide
- Used bike buying checklist
- Bike ownership transfer guide
- Bike maintenance guide
- Motorcycle insurance guide
- Registration-related educational content
- Model comparisons

Content should internally link to:

```text
Guide
  ↓
Brand page
  ↓
Model page
  ↓
Active listings
```

---

# 18. Recommended Technology Stack

## 18.1 Frontend

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
React Hook Form
Zod
TanStack Query
Zustand only where required
```

Use the Next.js App Router.

---

## 18.2 Backend

```text
NestJS
TypeScript
REST API
OpenAPI / Swagger
JWT Access Tokens
Refresh Tokens
RBAC
Class Validator / Zod where appropriate
```

The backend must remain independent from the website frontend so that the future mobile app can reuse it.

---

## 18.3 Database

Recommended:

```text
PostgreSQL
```

ORM:

```text
TypeORM
```

Database is the source of truth.

---

## 18.4 Cache

Recommended:

```text
Redis
```

Initial option:

```text
Upstash Redis
```

Use for:

- Popular pages
- Frequently requested lookup data
- Session-related data if required
- Rate-limiting counters
- Background job coordination
- Cached model data

---

## 18.5 Background Jobs

Recommended:

```text
BullMQ
Redis
```

Use background jobs for:

- Email sending
- Image processing
- Sitemap update jobs
- Search indexing
- Notifications
- Analytics aggregation
- Expired listing handling

---

## 18.6 Search

### Phase 1

Use:

```text
PostgreSQL
Indexes
pg_trgm
Full Text Search
```

### Phase 2

When search volume grows, introduce:

```text
OpenSearch
```

or:

```text
Typesense
```

Database remains source of truth.

Search engine is a read/search optimization layer.

---

## 18.7 Image Storage

Do not store user images inside the VPS filesystem long-term.

Recommended:

```text
Cloudflare R2
```

Alternative:

```text
Azure Blob Storage
```

Generate optimized image sizes at upload time.

Example:

```text
original
1600px large
800px card
400px thumbnail
```

Recommended formats:

```text
AVIF
WebP
```

Store only keys / URLs in PostgreSQL.

---

# 19. Initial Infrastructure Architecture

```text
                         INTERNET
                            │
                            ▼
                       CLOUDFLARE
                DNS / CDN / SSL / WAF
                            │
                            ▼
                         NGINX
                      Existing VPS
                    /              \
                   ▼                ▼
             NEXT.JS WEB        NESTJS API
                   │                │
                   └───────┬────────┘
                           │
                  MANAGED POSTGRESQL
                           │
                  ┌────────┼────────┐
                  ▼        ▼        ▼
                REDIS     R2      EMAIL
               Upstash  Images   Resend
```

---

# 20. Existing VPS Usage

Current VPS:

```text
Operating System: Ubuntu 24.04
Management: User-managed
Control Panel: None
```

Recommended use:

```text
Nginx
Node.js LTS
PM2
Next.js
NestJS
UFW
Fail2ban
Git
```

Do not install:

- cPanel unless absolutely required
- OpenSearch directly on a low-memory VPS
- Large image storage locally
- Unnecessary control panels

---

# 21. VPS Port Design

Example:

```text
80       Nginx HTTP
443      Nginx HTTPS
3000     Next.js — internal only
4000     NestJS — internal only
22       SSH — restricted
```

Do not expose PostgreSQL publicly.

Do not expose Redis publicly.

Nginx routes:

```text
marketplace.lk
    → localhost:3000

api.marketplace.lk
    → localhost:4000
```

---

# 22. Security Rules

## Required

- HTTPS only
- Cloudflare proxy enabled
- UFW configured
- SSH key authentication
- Disable root SSH login
- Disable password SSH login where possible
- Fail2ban
- Rate limiting
- API input validation
- Helmet
- Strict CORS policy
- Secure HTTP headers
- Password hashing with Argon2 or bcrypt
- JWT expiry
- Refresh-token rotation
- Role-based authorization
- Audit logging
- Image type validation
- File size validation
- Malware-safe upload processing
- SQL injection protection through ORM parameterization
- XSS protection
- CSRF protection where applicable
- Secrets stored outside Git
- Separate development/staging/production secrets

---

# 23. Personal Data Rules

Never publicly expose:

- NIC
- Full private home address
- Full unmasked registration documents
- Password hashes
- Refresh tokens
- Internal moderation notes
- Private email address unless the seller explicitly chooses to show it

Phone numbers must follow visibility rules.

Allow sellers to choose:

```text
Show phone
Show WhatsApp
Use contact form
```

---

# 24. Database High-Level Schema

## users

```text
id
first_name
last_name
email
phone
password_hash
status
email_verified_at
phone_verified_at
created_at
updated_at
```

---

## roles

```text
id
name
```

---

## user_roles

```text
user_id
role_id
```

---

## dealers

```text
id
owner_user_id
name
slug
description
logo_url
phone
whatsapp
email
website
address
district_id
city_id
status
verified_at
created_at
updated_at
```

---

## brands

```text
id
name
slug
logo_url
status
created_at
updated_at
```

---

## bike_models

```text
id
brand_id
name
slug
category_id
status
seo_title
seo_description
created_at
updated_at
```

---

## bike_variants

```text
id
model_id
name
engine_cc
fuel_type
transmission
created_at
updated_at
```

---

## listings

```text
id
seller_id
dealer_id nullable
brand_id
model_id
variant_id nullable
category_id
title
slug
description
price_lkr
negotiable
manufacture_year
registration_year
engine_cc
mileage
fuel_type
transmission
condition
colour
previous_owners
district_id
city_id
service_history_available
modified
accident_history_declared
exchange_accepted
finance_available
status
featured
urgent
view_count
published_at
expires_at
sold_at
created_at
updated_at
deleted_at nullable
```

---

## listing_images

```text
id
listing_id
storage_key
image_url
thumbnail_url
sort_order
is_cover
created_at
```

---

## favourites

```text
id
user_id
listing_id
created_at
```

Unique constraint:

```text
(user_id, listing_id)
```

---

## saved_searches

```text
id
user_id
name
query_json
notifications_enabled
created_at
updated_at
```

---

## listing_views

For high traffic, consider aggregated view tracking rather than storing every event forever.

```text
id
listing_id
user_id nullable
session_id nullable
viewed_at
```

Later archive/aggregate old records.

---

## reports

```text
id
listing_id
reported_by_user_id nullable
reason
description
status
reviewed_by
reviewed_at
created_at
```

---

## notifications

```text
id
user_id
type
title
message
data_json
read_at
created_at
```

---

## audit_logs

```text
id
actor_user_id
action
entity_type
entity_id
old_value_json
new_value_json
ip_address
created_at
```

---

# 25. Database Indexing

Indexes must be created according to production query patterns.

Initial important indexes:

```text
listings(status)
listings(brand_id)
listings(model_id)
listings(category_id)
listings(district_id)
listings(city_id)
listings(price_lkr)
listings(manufacture_year)
listings(mileage)
listings(created_at)
listings(published_at)
listings(seller_id)
listings(dealer_id)
```

Possible composite indexes:

```text
(status, published_at DESC)
(status, brand_id, model_id)
(status, district_id, price_lkr)
(status, brand_id, manufacture_year)
(status, dealer_id, published_at DESC)
```

Do not create every possible composite index without query analysis.

Use `EXPLAIN ANALYZE` during optimization.

---

# 26. Pagination

Avoid large `OFFSET` pagination for very large datasets.

Bad at high offsets:

```sql
SELECT *
FROM listings
ORDER BY created_at DESC
OFFSET 500000
LIMIT 20;
```

Prefer keyset/cursor pagination.

Example:

```sql
SELECT *
FROM listings
WHERE created_at < :cursor
ORDER BY created_at DESC
LIMIT 20;
```

---

# 27. REST API Structure

Version all APIs.

```text
/api/v1
```

---

## Authentication

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
```

---

## Users

```text
GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/password
```

---

## Listings

```text
GET    /api/v1/listings
GET    /api/v1/listings/:id
POST   /api/v1/listings
PATCH  /api/v1/listings/:id
DELETE /api/v1/listings/:id

POST   /api/v1/listings/:id/submit
POST   /api/v1/listings/:id/pause
POST   /api/v1/listings/:id/activate
POST   /api/v1/listings/:id/mark-sold
POST   /api/v1/listings/:id/renew
```

---

## Listing Images

```text
POST   /api/v1/listings/:id/images
DELETE /api/v1/listings/:id/images/:imageId
PATCH  /api/v1/listings/:id/images/order
PATCH  /api/v1/listings/:id/images/:imageId/cover
```

---

## Brands / Models

```text
GET /api/v1/brands
GET /api/v1/brands/:slug
GET /api/v1/brands/:brandId/models
GET /api/v1/models/:slug
```

---

## Dealers

```text
GET    /api/v1/dealers
GET    /api/v1/dealers/:slug
POST   /api/v1/dealers
PATCH  /api/v1/dealers/:id
GET    /api/v1/dealers/:id/listings
```

---

## Favourites

```text
GET    /api/v1/favourites
POST   /api/v1/favourites/:listingId
DELETE /api/v1/favourites/:listingId
```

---

## Saved Searches

```text
GET    /api/v1/saved-searches
POST   /api/v1/saved-searches
PATCH  /api/v1/saved-searches/:id
DELETE /api/v1/saved-searches/:id
```

---

## Reports

```text
POST /api/v1/reports
```

---

## Admin

```text
GET    /api/v1/admin/dashboard

GET    /api/v1/admin/listings
POST   /api/v1/admin/listings/:id/approve
POST   /api/v1/admin/listings/:id/reject

GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:id/status

GET    /api/v1/admin/dealers
POST   /api/v1/admin/dealers/:id/approve
POST   /api/v1/admin/dealers/:id/reject

CRUD   /api/v1/admin/brands
CRUD   /api/v1/admin/models
CRUD   /api/v1/admin/variants
CRUD   /api/v1/admin/locations

GET    /api/v1/admin/reports
PATCH  /api/v1/admin/reports/:id
```

---

# 28. Authentication Architecture

Use:

```text
Access Token
Short expiry

Refresh Token
Longer expiry
Rotated securely
```

Prefer storing refresh token in a secure HTTP-only cookie for web.

Mobile application can use secure device storage later.

---

# 29. Listing Status Workflow

Recommended statuses:

```text
DRAFT
PENDING_REVIEW
APPROVED
PUBLISHED
PAUSED
REJECTED
EXPIRED
SOLD
ARCHIVED
```

Workflow:

```text
DRAFT
  ↓
PENDING_REVIEW
  ↓
APPROVED
  ↓
PUBLISHED
  ├── PAUSED
  ├── SOLD
  └── EXPIRED
```

---

# 30. Listing Moderation

Admin must review:

- Suspicious title
- Invalid brand/model selection
- Duplicate listing
- Inappropriate image
- Invalid contact details
- Spam
- Misleading information

Rejection must include a reason.

Seller can correct and resubmit.

---

# 31. Duplicate Listing Prevention

Initial rules:

- Same seller
- Same phone
- Same model
- Same year
- Similar title
- Similar image hash — future
- Recent duplicate within configurable days

Do not automatically block all possible duplicates.

Allow admin review.

---

# 32. Image Upload Architecture

Recommended flow:

```text
User selects image
      ↓
Frontend validates basic size/type
      ↓
Backend generates signed upload target
      ↓
Object storage
      ↓
Background worker
      ↓
Resize
Compress
Generate thumbnail
Generate WebP/AVIF
      ↓
Update listing image record
```

Alternative for initial simple deployment:

Upload to backend temporarily, process immediately, push result to R2, delete temporary local file.

---

# 33. Performance Requirements

Target Core Web Vitals:

```text
LCP < 2.5 seconds
INP < 200 ms
CLS < 0.1
```

Suggested backend goals:

```text
P95 common cached GET requests: < 200–300 ms
P95 common DB-backed GET requests: < 500 ms
Search response target: < 300 ms where realistic
```

Targets are not guarantees and must be load-tested.

---

# 34. Caching Strategy

Cache candidates:

- Brand list
- Model list
- Location list
- Homepage popular sections
- Model SEO metadata
- Popular dealer pages
- Related bike data
- Frequently accessed listing summaries

Do not aggressively cache private account data.

Use proper cache invalidation.

---

# 35. Next.js Rendering Strategy

Use different strategies for different pages.

## Static / Long-Lived

- Terms
- Privacy
- About
- Static guides

## ISR / Cached SSR

- Brand pages
- Model pages
- Dealer pages
- Category pages

## Dynamic SSR

- Search results where necessary
- User-specific views

## Client-side

- Favourites interaction
- Compare interaction
- Dashboard controls

Do not render the entire application client-side.

---

# 36. Homepage Sections

Recommended:

1. Hero Search
2. Browse by Brand
3. Popular Bikes
4. Recently Added
5. Featured Listings
6. Browse by Category
7. Browse by Location
8. Dealer Spotlight
9. Sell Your Bike CTA
10. Buying Guides
11. Popular Model Links
12. Footer SEO Navigation

---

# 37. Listing Card

Must show:

- Image
- Title
- Price
- Year
- Mileage
- Location
- Seller type
- Featured badge if applicable
- Favourite button
- Published time

Avoid too much text.

---

# 38. Listing Detail Page

Recommended structure:

1. Breadcrumb
2. Image Gallery
3. Title
4. Asking Price
5. Main Specifications
6. Description
7. Seller Information
8. Call Button
9. WhatsApp Button
10. Favourite
11. Share
12. Report Listing
13. Similar Bikes
14. Same Model Listings
15. Dealer/Seller Other Listings
16. Safety Notice

---

# 39. Compare Bikes

Allow 2–4 motorcycles.

Compare:

- Price
- Year
- Brand
- Model
- Variant
- Mileage
- Engine CC
- Transmission
- Location
- Seller type
- Condition
- Service history declaration
- Features

---

# 40. Favourites

Favourites must support:

- Add
- Remove
- List
- Sort by newest
- Show sold status
- Show price changes

---

# 41. Price History

This is not valuation.

Record seller price changes.

Example:

```text
Initial asking price: Rs. 950,000
Current asking price: Rs. 890,000
Price reduced by: Rs. 60,000
```

Create table:

```text
listing_price_history

id
listing_id
old_price
new_price
changed_at
```

---

# 42. Notifications

Initial notifications:

- Listing approved
- Listing rejected
- Listing expired
- Listing expiring soon
- Saved bike price reduced
- Saved search has new matching listings — future
- Dealer account approved

Channels:

```text
In-app
Email
```

Future:

```text
Push Notification
SMS only if commercially justified
```

---

# 43. Email Provider

Recommended initial provider:

```text
Resend
```

Emails:

- Welcome
- Email verification
- Password reset
- Listing submitted
- Listing approved
- Listing rejected
- Listing expiring
- Dealer approved

---

# 44. Analytics

Install:

```text
Google Analytics 4
Google Search Console
Microsoft Clarity
Sentry
```

Track business events:

```text
search_performed
filter_applied
listing_viewed
favourite_added
compare_added
whatsapp_clicked
phone_clicked
seller_profile_viewed
dealer_profile_viewed
listing_created
listing_published
listing_marked_sold
```

---

# 45. Marketplace KPIs

Monitor:

- Monthly active users
- New listings per day
- Active listings
- Sold listings
- Dealer count
- Search-to-listing-view conversion
- Listing-view-to-contact conversion
- WhatsApp clicks
- Phone clicks
- Average listing lifetime
- Zero-result search rate
- Repeat visitors
- Organic traffic
- Indexed pages
- Click-through rate from Google

---

# 46. Admin Analytics

Admin dashboard should show:

- Total users
- Total sellers
- Total dealers
- Active listings
- Pending approvals
- Listings added today
- Listings sold
- Reported listings
- Top brands
- Top models
- Top locations
- Most viewed listings
- Search trends
- Contact clicks

---

# 47. Error Monitoring

Use:

```text
Sentry
```

Capture:

- Frontend errors
- Backend exceptions
- Failed API requests
- Performance traces

Never send sensitive secrets into logs.

---

# 48. Infrastructure Monitoring

Monitor:

- CPU
- Memory
- Disk usage
- Nginx status
- PM2 processes
- API response time
- Error rate
- PostgreSQL CPU
- PostgreSQL storage
- Connection usage
- Redis usage
- R2 storage
- Outbound traffic

---

# 49. Repository Structure

Recommended monorepo:

```text
bike-marketplace/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── admin/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── config/
│   └── eslint-config/
│
├── infrastructure/
│   ├── nginx/
│   ├── docker/
│   └── scripts/
│
├── docs/
│
├── .github/
│   └── workflows/
│
└── README.md
```

Future:

```text
apps/mobile/
```

---

# 50. Git Branch Strategy

Recommended:

```text
main
development
feature/*
bugfix/*
hotfix/*
```

Flow:

```text
feature branch
    ↓
development
    ↓
staging
    ↓
main
    ↓
production
```

---

# 51. CI/CD

Use GitHub Actions.

Pipeline:

```text
Push / Pull Request
       ↓
Install Dependencies
       ↓
Lint
       ↓
Type Check
       ↓
Unit Tests
       ↓
Build
       ↓
Security Checks
       ↓
Deploy
       ↓
PM2 Reload
```

---

# 52. VPS Deployment Strategy

Recommended directories:

```text
/var/www/bike-marketplace/web
/var/www/bike-marketplace/api
```

Environment:

```text
/etc/bike-marketplace/
```

or secure `.env` files with proper file permissions.

PM2 apps:

```text
bike-web
bike-api
```

---

# 53. Nginx Design

Example architecture:

```text
server {
    server_name example.lk www.example.lk;

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

API:

```text
server {
    server_name api.example.lk;

    location / {
        proxy_pass http://127.0.0.1:4000;
    }
}
```

Add:

- Proxy headers
- Timeout settings
- Compression
- Security headers
- Request size limits

---

# 54. Build Strategy

Avoid heavy production builds directly on a small VPS if memory is limited.

Preferred:

```text
GitHub Actions
     ↓
Build
     ↓
Deploy built artifact/container
     ↓
PM2 reload
```

For a containerized future:

```text
GitHub Actions
    ↓
Docker build
    ↓
Container registry
    ↓
Deploy container
```

---

# 55. Backup Strategy

Must back up:

- PostgreSQL
- Environment configuration
- Object storage metadata
- Important server configuration
- Nginx configuration

Recommended:

```text
Daily automated DB backup
Weekly restore test
Retention policy
```

A backup is not considered valid until restore has been tested.

---

# 56. Scaling Roadmap

## Stage 1 — MVP

```text
Existing VPS
Next.js
NestJS
Managed PostgreSQL
R2
Upstash Redis
Cloudflare
```

Suitable for early production.

---

## Stage 2 — Growing Traffic

Increase:

- VPS CPU/RAM
- PostgreSQL plan
- Redis capacity

Introduce:

- Search service if required
- Additional caching
- Separate workers

---

## Stage 3 — High Traffic

Separate:

```text
Web Server
API Server
Worker Server
Managed DB
Redis
Search
```

Use load balancer.

---

## Stage 4 — Large Marketplace

```text
Cloudflare
      ↓
Load Balancer
      ↓
┌─────────┬─────────┬─────────┐
│ API #1  │ API #2  │ API #3  │
└─────────┴─────────┴─────────┘
      ↓
Redis
      ↓
Search Cluster
      ↓
PostgreSQL Primary
      ↓
Read Replicas
```

At this stage, use managed container autoscaling such as:

```text
Azure Container Apps
AWS ECS/Fargate
Google Cloud Run
```

---

# 57. Stateless API Requirement

NestJS API must be stateless.

Do not store:

- User session in local process memory
- Uploaded permanent files locally
- Queue state only in local RAM
- Important temporary state that cannot survive restart

This allows multiple API instances later.

---

# 58. Future Mobile App

Recommended future choice:

```text
React Native + TypeScript
```

Reason:

- Same TypeScript ecosystem
- Existing REST API reused
- Shared types possible
- Shared validation possible

Architecture:

```text
Next.js Web ───────┐
                   │
React Native App ──┼── NestJS REST API
                   │
Admin App ─────────┘
```

---

# 59. Mobile App Initial Features

When mobile development begins:

1. Login/Register
2. Home
3. Search
4. Filters
5. Listing Details
6. Favourites
7. Compare
8. Sell Bike
9. My Listings
10. Notifications
11. Seller Contact

Do not rebuild every admin feature in the first mobile release.

---

# 60. Monetization Roadmap

Initial platform can remain mostly free.

Future revenue:

- Featured listing
- Top listing
- Urgent badge
- Dealer monthly package
- Dealer premium showroom
- Homepage advertising
- Brand advertising
- Finance-company advertising
- Insurance-company leads
- Motorcycle accessories advertising
- Dealer analytics upgrades

---

# 61. Dealer Plans — Future Example

These are placeholders, not final pricing.

```text
Free
- 5 active listings

Basic
- 25 active listings
- Dealer profile
- Basic analytics

Pro
- Higher/unlimited listing allowance
- Advanced analytics
- Priority support
- Featured listing allocation
```

Pricing should be validated with real dealers.

---

# 62. Non-Functional Requirements

## Availability

Target early production:

```text
99.5%+
```

Higher SLA only when business requires it.

---

## Reliability

- Graceful error handling
- Automatic PM2 restart
- Database backups
- Retry background jobs
- Idempotent critical operations

---

## Accessibility

Target:

```text
WCAG 2.1 AA where practical
```

Requirements:

- Keyboard navigation
- Visible focus state
- Semantic HTML
- Alt text
- Form labels
- Colour contrast
- Error descriptions

---

## Responsiveness

Support:

- Mobile
- Tablet
- Laptop
- Desktop
- Large desktop

Design mobile-first.

---

# 63. Testing Strategy

## Unit Tests

Test:

- Services
- Utilities
- Validation
- Pricing history logic
- Listing status logic

---

## Integration Tests

Test:

- Authentication
- Database
- Listing creation
- Listing moderation
- Favourites
- Dealer workflows

---

## End-to-End Tests

Recommended:

```text
Playwright
TypeScript
```

Critical journeys:

```text
Register
Login
Create listing
Admin approval
Search listing
Open listing
Favourite
Compare
Contact seller
Mark sold
```

---

# 64. Performance Testing

Recommended tools:

```text
k6
or
JMeter
```

Load-test:

- Homepage
- Search
- Brand page
- Model page
- Listing page
- Login
- Favourites
- Create listing

Test stages:

```text
100 concurrent users
500 concurrent users
1,000 concurrent users
5,000 concurrent users
```

Scale progressively.

---

# 65. SEO QA Checklist

Before production:

- Every page has unique title
- Every page has meta description
- Canonical URL correct
- No staging URLs indexed
- robots.txt correct
- sitemap valid
- Structured data valid
- Breadcrumbs valid
- No broken internal links
- No duplicate indexable filters
- Sold page handling correct
- Correct HTTP status codes
- Page speed tested
- Mobile usability tested
- Google Search Console connected

---

# 66. Technical SEO Checklist

- SSR/ISR enabled
- No important content hidden behind client-only JS
- Semantic headings
- One primary H1
- Correct canonical
- Clean slugs
- Internal links are crawlable anchors
- Lazy-load below-fold images
- Preload critical fonts carefully
- Optimized images
- Stable layout
- Proper redirects
- Avoid redirect chains
- No accidental `noindex`
- Avoid giant JavaScript bundles

---

# 67. Initial MVP Scope

The first production release should include only the following:

## Public

- Home
- Browse
- Search
- Filters
- Brand pages
- Model pages
- Listing details
- Seller profile
- Dealer profile
- Compare
- Contact seller
- Blog / guide foundation

## Account

- Login
- Register
- Profile
- Favourites
- My listings
- Add listing
- Edit listing
- Mark sold

## Admin

- Dashboard
- Listing moderation
- User management
- Dealer approval
- Brand management
- Model management
- Location management
- Reports

## Infrastructure

- Next.js
- NestJS
- PostgreSQL
- R2
- Cloudflare
- Redis optional initially
- Email
- Monitoring
- CI/CD

---

# 68. Features Explicitly Deferred

Do not delay MVP for:

- Native mobile app
- Vehicle valuation
- Physical inspections
- In-platform payment
- Escrow
- Auctions
- Live chat
- AI chatbot
- Machine-learning recommendation engine
- Dealer ERP integration
- Finance API integration
- Insurance API integration
- Spare-parts marketplace

These can be considered after marketplace traction.

---

# 69. Development Phases

## Phase 0 — Foundation

- Finalize brand name
- Buy `.lk` domain
- Create GitHub repository
- Create monorepo
- Set coding standards
- Configure linting
- Configure CI
- Configure environments
- Create base DB

---

## Phase 1 — Core Backend

- Auth
- Users
- Roles
- Brands
- Models
- Locations
- Listings
- Image upload
- Seller flows
- Admin moderation

---

## Phase 2 — Public Web

- Home
- Browse
- Search
- Filters
- Listing details
- Seller pages
- Dealer pages
- Responsive UI

---

## Phase 3 — SEO

- Metadata
- Brand pages
- Model pages
- Canonicals
- Sitemap
- robots.txt
- JSON-LD
- Internal links
- Search Console

---

## Phase 4 — Buyer Features

- Favourites
- Compare
- Recently viewed
- Saved searches
- Price history
- Notifications

---

## Phase 5 — Dealer Module

- Dealer registration
- Dealer approval
- Dealer dashboard
- Inventory
- Dealer showroom
- Analytics

---

## Phase 6 — Optimization

- Redis
- DB query optimization
- Image optimization
- Caching
- Load testing
- Security review
- Accessibility review

---

## Phase 7 — Growth

- Monetization
- Featured listings
- Dealer packages
- Better analytics
- Search engine migration if needed
- Content SEO scaling

---

# 70. Environment Variables

Example:

```env
NODE_ENV=production

WEB_URL=
API_URL=

DATABASE_URL=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

REDIS_URL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=

RESEND_API_KEY=
EMAIL_FROM=

SENTRY_DSN=
```

Never commit `.env` files.

---

# 71. Coding Standards

- TypeScript strict mode
- ESLint
- Prettier
- DTO validation
- No `any` unless justified
- Central error handling
- Central logger
- No secrets in logs
- Consistent API responses
- Service-layer business logic
- Repository/data-access separation where useful
- Reusable UI components
- Avoid duplication

---

# 72. API Response Standard

Example success:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Example error:

```json
{
  "success": false,
  "error": {
    "code": "LISTING_NOT_FOUND",
    "message": "Listing not found"
  }
}
```

---

# 73. Logging

Use structured logs.

Log:

- Timestamp
- Request ID
- User ID when available
- Route
- Method
- Status code
- Duration
- Error code

Do not log:

- Passwords
- Access tokens
- Refresh tokens
- Full payment details
- Sensitive identity documents

---

# 74. Rate Limiting

Apply stricter limits to:

- Login
- Register
- Password reset
- Report listing
- Contact endpoints
- Upload endpoints

More relaxed limits for normal browsing.

Cloudflare can block abusive traffic before it reaches the VPS.

---

# 75. Search Quality

Search should handle:

```text
Honda Hornet
Hornet 160
Yamaha FZ
Pulsar 150
Dio
Scooty
```

Future typo tolerance:

```text
Hondaa
Honret
Ymaha
```

PostgreSQL `pg_trgm` can provide initial fuzzy matching.

Move to a dedicated search engine when justified by traffic and search quality needs.

---

# 76. SEO Model Entity Strategy

Create permanent model records.

Example:

```text
Brand:
Honda

Model:
Hornet 160R

Slug:
hornet-160r
```

A model SEO page should not depend on a specific listing.

This allows the page to keep ranking even when individual bikes are sold.

---

# 77. Internal Linking Strategy

Every page should help Google discover related pages.

Example:

```text
Honda page
  ↓
Honda Hornet
Honda Dio
Honda CB

Honda Hornet page
  ↓
Colombo Hornet
Gampaha Hornet
Related Yamaha FZ
Related TVS Apache

Listing page
  ↓
Honda Hornet page
Seller profile
Similar listings
Location page
```

---

# 78. Core SEO Goal

Target queries such as:

```text
Honda Hornet 160R Sri Lanka
Honda Hornet for sale Sri Lanka
Yamaha FZ for sale
Bajaj Pulsar price Sri Lanka listings
used bikes Sri Lanka
motorcycles for sale Sri Lanka
scooters for sale Sri Lanka
```

The platform must never claim valuation unless an actual valuation system is introduced.

For price-related SEO, use wording like:

```text
Current asking prices
Advertised prices
Listings from sellers
```

---

# 79. Infrastructure Cost Philosophy

Do not provision infrastructure for millions of users on day one.

Design the software so it can scale.

Pay only for current traffic.

Initial third-party services can be kept low-cost using:

- Existing VPS
- Cloudflare Free
- R2
- Upstash
- Resend
- Managed PostgreSQL at a small plan

Scale each component independently later.

---

# 80. MVP Success Criteria

The first version is successful if it can:

- Publish listings reliably
- Rank indexable pages in Google
- Support mobile users smoothly
- Allow buyers to find relevant bikes quickly
- Allow sellers to create listings easily
- Allow dealers to manage inventory
- Allow admins to control content
- Remain fast under normal early traffic
- Collect useful marketplace analytics

---

# 81. Initial Business Growth Target

Recommended early operational targets:

```text
Phase 1:
100–500 quality listings

Phase 2:
1,000+ listings

Phase 3:
5,000–10,000 listings

Phase 4:
Dealer acquisition and organic SEO scaling
```

Listing quality is more important than artificially inflating listing counts.

---

# 82. Recommended Launch Strategy

Before public launch:

1. Add real brand/model taxonomy.
2. Add 20–50 high-quality SEO landing pages.
3. Onboard several dealers.
4. Seed enough real listings.
5. Verify mobile speed.
6. Connect Search Console.
7. Generate sitemap.
8. Ensure no staging site is indexable.
9. Run security checks.
10. Run load tests.
11. Launch.
12. Monitor Google indexing and search queries.
13. Improve model pages based on actual search demand.

---

# 83. Future Expansion

After marketplace traction:

- Mobile app
- Dealer subscriptions
- Featured listing payment
- Spare parts marketplace
- Riding accessories
- Finance enquiries
- Insurance enquiries
- Push notifications
- Dealer team accounts
- More advanced recommendations
- AI-assisted listing descriptions
- Duplicate image detection
- Fraud-risk detection

---

# 84. Final Recommended Stack

| Layer | Technology |
|---|---|
| Public Web | Next.js |
| Language | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Backend | NestJS |
| API | REST + OpenAPI |
| ORM | TypeORM |
| Database | PostgreSQL |
| Cache | Redis / Upstash |
| Jobs | BullMQ |
| Search Phase 1 | PostgreSQL + pg_trgm |
| Search Phase 2 | OpenSearch / Typesense |
| Image Storage | Cloudflare R2 |
| CDN / WAF / DNS | Cloudflare |
| Email | Resend |
| Web Server | Nginx |
| Process Manager | PM2 |
| Initial Hosting | Existing Ubuntu VPS |
| CI/CD | GitHub Actions |
| Monitoring | Sentry |
| Product Analytics | GA4 + Clarity |
| SEO Tools | Google Search Console |
| Mobile Future | React Native |

---

# 85. Final Architecture

```text
                               GOOGLE
                                  │
                                  ▼
                             CLOUDFLARE
                       CDN / WAF / SSL / DNS
                                  │
                                  ▼
                                NGINX
                            EXISTING VPS
                      ┌───────────┴───────────┐
                      ▼                       ▼
                 NEXT.JS WEB             NESTJS API
                      │                       │
                      │              ┌────────┼─────────┐
                      │              ▼        ▼         ▼
                      │         POSTGRESQL   REDIS     QUEUE
                      │                                │
                      │                                ▼
                      │                             WORKERS
                      │
                      └───────────────┬────────────────┘
                                      ▼
                               CLOUDFLARE R2
                                  IMAGES
```

Future:

```text
                        MOBILE APPLICATION
                               │
                               ▼
                          SAME NESTJS API
```

---

# 86. Core Engineering Principles

1. SEO-first.
2. Mobile-first.
3. API-first.
4. Stateless backend.
5. Database is source of truth.
6. Object storage for files.
7. Cache only where useful.
8. Do not prematurely introduce expensive infrastructure.
9. Optimize real bottlenecks using measurements.
10. Keep URLs permanent.
11. Keep SEO pages useful.
12. Never allow uncontrolled filter URLs to become crawl traps.
13. Build the website so the future mobile app can reuse the same API.
14. Design for scale, but pay for current usage.
15. Measure everything important.

---

# 87. Final Product Definition

The product is:

> **A fast, SEO-first, mobile-first motorcycle and scooter marketplace for Sri Lanka, built around high-quality listings, motorcycle-specific discovery, seller/dealer profiles, comparison tools, scalable architecture and strong organic search visibility.**

The first objective is not to create every possible marketplace feature.

The first objective is to create a technically strong, fast, indexable marketplace that can acquire listings, buyers, dealers and organic Google traffic.

Once real marketplace traction is established, additional revenue and ecosystem features can be added without rewriting the core platform.

---

# End of Master Specification
