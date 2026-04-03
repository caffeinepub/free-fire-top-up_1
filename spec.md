# DRN ML TopUp — Version 10

## Current State
App is a Free Fire Diamond Top-Up site with:
- White theme (Winzer Topup style)
- 6 diamond packages (Rs 40–1010)
- Manual payment via eSewa with screenshot upload
- Order submission saves to backend canister via `submitManualOrder`
- Admin dashboard with password-protected order management
- Login/register modal with localStorage auth

## Requested Changes (Diff)

### Add
- Weekly Membership package (Rs 210.00) with VIP crown icon
- Monthly Membership package (Rs 1,020.00) with VIP crown icon
- "Order Now" button on each package card that leads directly to payment screen
- localStorage order fallback so orders always save even if backend call fails

### Modify
- Complete UI theme change: Bakuzone style = dark background (#0D0D0D / #111827), rounded cards, vibrant accent colors
- Package grid cards: dark bg, show diamond/VIP icon, name, price, Order Now button
- Header: dark background
- Bottom nav: dark background
- Order submission: rewritten with try/catch and localStorage fallback for global reliability
- index.css: add dark theme variables
- tailwind.config: add dark theme color tokens

### Remove
- White/light background throughout
- Orange-only accent (keep orange for CTAs, use dark palette for backgrounds)

## Implementation Plan
1. Update PACKAGES array to include `type: 'diamond' | 'membership'`, add 2 membership entries
2. Rewrite handleManualSubmit with localStorage fallback
3. Update package card UI — add Order Now button, VIP icons for membership, dark card style
4. Update index.css to dark theme OKLCH variables
5. Update tailwind.config with dark color tokens (bz-bg, bz-card, bz-border, bz-text, etc.)
6. Update header, main, bottom nav to dark backgrounds
7. Update all wt- class references to bz- dark equivalents
