# TiLT Protein - Playwright + TypeScript Automation

This framework is being built specifically for the TiLT Protein PDP test-case suite.

## Current implementation

### P0 test cases

TC001 - Product page loads without errors
- Validates that the PDP returns a successful HTTP response (2xx/3xx), the browser reaches a `/products/` URL, the product title is visible, and the product price is visible.

TC002 - Correct product title displayed
- Validates that the product title is `Vanilla Almond` and the related flavour list includes `Chocolate Sea Salt`.

TC003 - Correct selling price displayed
- Validates the visible `Subscribe & Save 10%` price is `$35.99` and the `One-time purchase` price is `$39.99`.

TC104 - Compare-at price and discount display correctly
- Compares the one-time price and any displayed compare-at price with the selected Shopify variant, verifies the subscription price matches the stated 10% discount, and ensures no compare-at price is shown when Shopify provides none.

TC004 - Correct currency displayed
- Validates the prices display the `$` currency symbol.

TC005 - Correct product image updates on variant change
- Validates that switching between PDP variants updates the visible product image and selected product title.

TC006 - Sold-out variants are disabled or clearly marked
- Validates that any out-of-stock variant is visibly marked or disabled instead of being selectable.

TC039 - Low-stock messaging is correct when present
- When a low-stock message is shown in the product information panel, verifies it is visible, matches a supported message format, and reports a positive remaining quantity when numeric. Skips when the selected product is not currently in a low-stock state.

TC007 - Add to Cart works for both product variants
- Validates that each flavor variant can be selected and the cart updates after clicking Add to Cart.

TC014 - Rapid Add to Cart clicks do not duplicate a 40-item cart line
- Sets the product quantity to 40, issues three rapid Add to Cart clicks, and checks the cart retains one line item with quantity 40.

TC016 - Buy Now passes the correct variant and quantity to checkout
- Sets quantity to 2, verifies the selected product variant, clicks Buy Now, and checks that checkout opens with that product.

TC017 - Quantity selector increases and decreases correctly on PDP and side cart
- Verifies that + and − update quantity on both the product page and side cart. At quantity 1, the PDP must remain at 1; the side cart may remain at 1 or display a non-empty validation message if it temporarily reaches 0.

TC018 - Invalid manual quantity characters are rejected on PDP and side cart
- Attempts to enter alphabetic and special characters into the numeric quantity input and verifies neither changes the quantity from 1.

TC019 - Subscription product adds the correct selling plan to cart
- Selects Subscribe & Save, adds the product to the cart, and verifies the cart line shows the subscription plan and includes a selling-plan ID in its product link.

TC020 - One-time purchase selection adds the correct product to cart
- Selects One-time purchase, verifies the $39.99 price, and checks the cart line contains no subscription selling-plan ID.

TC021 - Subscription pricing and discount are correct
- Verifies that Subscribe & Save is selected, the displayed subscription price is the one-time price reduced by 10% (rounded to cents), and the cart shows that same subscription price and plan.

TC022 - Checkout handoff preserves product, variant, quantity, and price
- Adds two units with Subscribe & Save, captures the product, quantity, and line price in the cart, then verifies those values and the subscription plan are unchanged in checkout, including the order total.

TC023 - PDP works in Safari desktop
- Opens both product pages in the Playwright Desktop Safari (WebKit) project and verifies a successful response, PDP URL, expected product title, and visible price.

TC079 - Product page works in Microsoft Edge
- Runs the product-page load smoke test for both products using the installed Microsoft Edge channel.

TC080 - Product page works in Firefox
- Runs the product-page load smoke test for both products using Playwright Firefox.

TC024 - view_item analytics event fires correctly
- Verifies a GA4 `view_item` dataLayer event is emitted for the correct product and pack variant, with quantity, currency, and matching item/event prices.

TC025 - add_to_cart analytics event fires correctly
- Adds two units and verifies a new GA4 `add_to_cart` dataLayer event includes the correct product, pack variant, quantity, currency, and event value equal to unit price times quantity.

TC026 - begin_checkout analytics event fires correctly
- Adds two subscription units, proceeds through the cart checkout button, and verifies the GA4 `begin_checkout` event contains the product, pack variant, quantity, currency, and matching total value.

TC027 - Analytics passes correct product/variant IDs, price, and currency
- Verifies `view_item`, `add_to_cart`, and `begin_checkout` carry the expected Shopify product ID and variant ID, the $39.99 One-time purchase price, USD currency, and a matching event value.

TC028 - Analytics events fire only once per user action
- Verifies one `view_item` event for a page load, one `add_to_cart` event for a single cart action, and one `begin_checkout` event for a single checkout action, with a short stability window to catch duplicate emissions.

TC029 - Product description displays correctly
- Verifies the expanded Description accordion contains the correct flavor-specific opening and product copy, all listed macro values, and each stated probiotic, absorption, ingredient, and recovery benefit.

TC030 - Product images load correctly
- Verifies each product gallery thumbnail image is fully loaded and has non-zero natural dimensions.

TC081 - Above-fold product hero image is not lazy-loaded
- At a mobile viewport, verifies the initial hero image is fully above the fold, not lazy-loaded or marked low priority, fully decodes with non-zero dimensions, starts before the page load event, and completes its network load within five seconds.

TC082 - Product page has no major layout shifts
- Captures browser layout-shift performance entries from navigation at a 390px viewport, excludes shifts following user input, and verifies cumulative layout shift remains below 0.1. Skips in browsers that do not expose the Layout Instability API.

TC083 - Third-party scripts do not noticeably block PDP
- Verifies external third-party scripts are not parser-blocking, DOMContentLoaded occurs within eight seconds, and key PDP actions (quantity changes and Add to Cart) remain responsive.

TC084 - Product structured data exists
- Verifies the page publishes valid Product JSON-LD for the selected product, including its name, URL, description, image, SKU, brand, and an in-stock USD Offer with a positive price.

TC085 - Schema price matches the displayed price
- Compares the Product Offer price and currency with the visible one-time purchase price and USD market.

TC086 - Schema availability matches the live variant
- Compares Product Offer availability with the selected Shopify variant's current availability from the product JSON endpoint.

TC087 - Review schema matches the review widget
- Verifies JSON-LD AggregateRating values match the Judge.me summary, and individual review ratings, authors, bodies, and publication dates are valid.

TC088 - Canonical URL matches the product page
- Verifies exactly one canonical link points to the selected product URL without query parameters or fragments.

TC089 - Meta title matches the product
- Verifies the page title and Open Graph title identify the selected product and TiLT PROTEIN brand.

TC090 - Meta description matches the product
- Verifies the meta and Open Graph descriptions identify the product and contain meaningful text.

TC091 - UTM parameters do not break PDP behavior
- Opens the PDP with UTM source, medium, and campaign parameters, verifies the product and price load, then exercises variant selection, quantity, and Add to Cart. Tracking parameters may be dropped when navigation follows the flavor link.

TC092 - PDP remains usable on a slow network
- Adds 250ms latency to each first-party request, confirms the PDP returns successfully with product title, price, quantity, and Add to Cart available, then checks quantity controls and the cart flow still work.

TC093 - Variant change during Add to Cart keeps the submitted variant
- Delays the Add to Cart response after the selected variant is submitted, switches to the alternate flavor while the request is in flight, then verifies the cart contains only the initially submitted flavor and the request used its variant ID.

TC094 - Going offline during Add to Cart fails gracefully
- Takes the browser offline after the PDP loads, verifies the failed Add to Cart leaves the PDP usable without adding a cart line, then restores connectivity and confirms a retry succeeds.

TC095 - Vendor displays correctly
- Verifies the Shopify product vendor is `Tilt` for each flavor and matches the Product structured-data brand.

TC096 - Product type displays correctly
- Verifies each product has the `protein-bars` Shopify tag and displays the mapped product type, `Protein Bars`, on the product page.

TC097 - Tags display correctly where used
- Verifies Shopify product tags are valid and that any visible product-tag labels on the page match the product's tag data.

TC098 - Breadcrumb schema is correct
- Verifies one BreadcrumbList JSON-LD entry contains the ordered Home, Shop, and current product items with correct positions and URLs.

TC099 - PDP functionality works on iPhone Safari
- Uses an iPhone Safari WebKit device profile to verify the product title, price, quantity control, and Add to Cart flow.

TC100 - PDP functionality works on Android Chrome
- Uses an Android Chrome Chromium device profile to verify the product title, price, quantity control, and Add to Cart flow.

TC101 - Sticky Add to Cart works on mobile
- Scrolls the standard purchase control out of view, verifies the sticky mobile Add to Cart appears in the viewport, then adds the product from the sticky control.

TC102 - Mobile variant selectors work
- Uses mobile touch-device profiles to select the alternate flavor and verifies the product URL, title, and active flavor state update.

TC103 - No mobile overlay prevents Add to Cart
- Waits for mobile popups, dismisses any dismissible promotional overlay, and verifies purchase options, quantity controls, and Add to Cart remain usable.

TC031 - All product thumbnails work
- Clicks each gallery thumbnail and verifies its image has loaded and the thumbnail becomes the selected gallery item.

TC032 - Mobile product gallery swipe animates smoothly
- At a mobile viewport, drags the gallery horizontally and verifies the next image is selected, the transform animation completes within 600 ms, and the page does not gain horizontal overflow.

TC033 - Product image zoom and lightbox work
- Opens the active product image, verifies the larger image appears in the media dialog, then closes the dialog and confirms the PDP image is visible again.

TC034 - Product videos play correctly when available
- If a gallery video is present, activates it and verifies playback advances; skips the test when the product has no gallery video.

TC035 - Different product image aspect ratios do not break gallery layout
- Selects every gallery image at desktop and mobile widths, verifies the gallery and media container keep consistent dimensions without image or page overflow, and confirms the gallery includes varied intrinsic image aspect ratios.

TC036 - Variant selection updates the product URL correctly
- Selects the alternate flavor, verifies the URL path and product title update to match it, then reloads to confirm the variant URL remains valid.

TC037 - Shared variant URL opens the correct product
- Selects the alternate flavor, opens its resulting URL in a separate page, and verifies the destination URL and product title identify that flavor.

TC038 - Selected variant survives page refresh
- Selects the alternate flavor, verifies its product URL, title, and active flavor marker, then reloads and confirms the same variant remains selected.

TC040 - Flavor color swatches map to the correct variants
- Verifies each flavor swatch image label and destination URL match its variant, then selects the alternate swatch and checks the active variant, title, and URL update together.

TC041 - Selected flavor swatch state is visually obvious
- Verifies exactly one flavor is marked active and its visible border is stronger than the unselected swatch before and after changing flavors.

TC042 - Unavailable flavor swatches are disabled
- For each swatch explicitly marked sold out, unavailable, or out of stock, verifies it is not an active link and exposes a disabled state. Skips when no unavailable flavor swatches are shown.

TC043 - Size options map correctly when available
- Verifies selectable size options have distinct labels and variant values, and selecting each option marks the corresponding size as selected. Skips when the product has no size options.

TC044 - Size chart opens correctly when available
- Opens the product's size chart and verifies it is visible and contains content. Skips when no size-chart control is provided.

TC045 - Correct product or category size chart is shown when available
- Opens the size chart and verifies it identifies the product or protein-bar category. Skips when no size-chart control is provided.

TC046 - Product metafields display correctly
- Opens available metafield-backed sections and verifies their content and rendered semantic elements are visible. Skips when no product metafields are rendered.

TC047 - Empty metafields do not create empty sections
- Checks product metafield accordion sections for empty titles or content and verifies empty metafields do not leave a visible section behind.

TC048 - Long metafield content does not break layout
- Checks long metafield content at desktop and mobile widths for containment and horizontal page overflow. Skips when no long metafield content is available.

TC049 - Rich-text metafields render correctly
- Verifies available rich-text metafields render using semantic HTML elements rather than flattened text. Skips when no non-empty rich-text metafields are rendered.

TC050 - Metafield metaobjects and references load correctly
- Verifies rendered metafield reference images load and reference links have destinations. Skips when no metafield references are rendered.

TC051 - Product-specific specifications are correct
- Verifies the selected product flavor, 12-bar pack information, flavor-specific description, and displayed nutrition facts.

TC052 - Product accordions open and close correctly
- Toggles each product information accordion in both directions and verifies its open state, `aria-expanded` value, and content visibility.

TC077 - Product accordions are usable on mobile
- At a 390px viewport, verifies each product accordion summary is visible with a 44px-or-larger tap target, can be opened and closed, and its content does not create horizontal page overflow.

TC053 - Shipping accordion content is correct
- Opens each Shipping FAQ accordion and verifies its answer covers the published shipping timing, cost, tracking, damaged-order, and address-change guidance.

TC054 - Returns accordion content is correct when available
- Opens each product or FAQ accordion about returns, refunds, or the satisfaction guarantee and verifies the answer contains return/refund guidance. Skips when the product page has no such accordion.

TC055 - Product FAQs display correctly
- Verifies Product, Subscription, and Shipping FAQ tabs show the expected number of questions, non-empty answers, and flavor-specific product FAQ content.

TC056 - Product review rating is correct
- Verifies the review badge belongs to the selected product and that the visible rounded rating matches the review widget's numeric average and star score.

TC057 - Product review count is correct
- Verifies the review badge belongs to the selected product and the displayed review count matches its review widget count.

TC058 - Clicking review stars navigates to reviews
- Clicks the product's review stars and verifies the product reviews heading scrolls into the viewport.

TC059 - Review summary handles zero-review state safely
- Verifies the live product review summary has a non-negative integer count and no invalid numeric display; if its count is zero, it also checks that any displayed average and star score are zero.

TC060 - Large number of reviews does not break page layout
- Requires at least 500 live reviews, opens the reviews section, verifies review content renders, and checks that the widget and page do not overflow at desktop and 390px viewport widths.

TC061 - Review filtering and sorting work
- Filters reviews to one star and verifies all visible reviews match, clears the filter, then checks that Highest Rating and Lowest Rating sort the visible reviews in the correct order.

TC062 - Review pagination works
- Verifies the first page state and previous/next controls, navigates to pages 2 and 3, checks that review cards update, and confirms previous-page navigation returns to the second page.

TC076 - Reviews are usable on mobile
- At a 390px viewport, verifies the review filter and sort controls fit within the screen and remain usable, filters to one-star reviews, sorts by highest rating, advances pagination, and checks for horizontal page overflow.

TC063 - Subscription frequency option works
- Verifies the available monthly subscription cadence maps to its selling-plan ID, clears that ID when one-time purchase is selected, and restores it when the subscription option is selected again.

TC064 - Variant change preserves subscription selection
- Selects Subscribe & Save, changes flavor, then verifies the subscription option remains selected and the new variant's selling-plan ID is applied.

TC065 - Frequently Bought Together adds both flavors
- Uses the Get both flavors bundle CTA and verifies the cart contains exactly one of each flavor, both with the monthly subscription selling plan and the expected combined total.

TC066 - Upsell products are correct
- Verifies the alternate-flavor card links to the correct product and the Get both flavors bundle contains the expected variants as one subscription unit each.

TC067 - Sold-out upsell items are not purchasable
- Checks live Shopify variant availability and verifies sold-out variants are excluded from an enabled Get both flavors bundle CTA. Skips when both upsell products are available.

TC068 - Cross-sell items update with the selected flavor
- Verifies the recommended flavor card and bundle variants match the initial product, switches flavors, then checks the cross-sell recommendation and bundle data update for the new product.

TC069 - Quantity discount logic is correct
- Verifies subscription unit price is 10% below one-time price and the Add to Cart total scales correctly at quantities 1, 2, and 3 for both purchase options.

TC070 - Higher-quantity pricing follows configured discounts
- Checks Add to Cart totals at quantities 1, 2, 3, 6, and 12 for subscription and one-time purchase, comparing each total with the displayed unit price. The current PDP has no additional quantity tiers.

TC071 - Multiple promotions do not conflict unexpectedly
- Verifies the 10% subscription promotion is applied once at quantity 2, one-time purchase uses its undiscounted unit price, and the Get both flavors bundle total equals two subscription-priced items without an extra stacked tier.

TC072 - Estimated delivery date matches published shipping window
- Verifies the published Standard (3–4 business days), Express (1–2 business days), and dispatch cutoff timelines. When the PDP shows a method-specific estimated-delivery line, verifies its method and delivery window agree with the policy; skips when no estimate is displayed.

TC073 - Postal-code checker responds
- If the PDP provides a visible postal/ZIP-code input, enters a valid-format U.S. ZIP code and verifies the checker updates its response. Skips when no postal-code checker is present.

TC074 - Checkout postal-code checker updates shipping options
- Adds a product to cart, enters a New York shipping address in checkout, and verifies a valid ZIP displays Standard and Express shipping options. An invalid ZIP must show checkout validation feedback; restoring a valid ZIP clears the error. The test does not submit payment or place an order.

TC075 - U.S. market checkout pricing matches the product price
- Covers the U.S. checkout market currently available on the storefront. Verifies checkout country is United States, checkout currency is USD, and the subscription line price matches the PDP and cart. Canada/CAD is not currently offered by the live storefront.

TC078 - Popups do not block important PDP actions
- At a 390px viewport, waits for delayed promotional dialogs and dismisses any accessible popup. Verifies the one-time purchase option, quantity selector, Add to Cart action, and resulting cart item remain usable.

## Test data

Current PDP URLs used:
- https://tiltprotein.com/products/chocolate-sea-salt
- https://tiltprotein.com/products/vanilla-almond

These are intentionally kept configurable through `.env` via `PDP_URL` or `PDP_URLS`.

## Setup

```bash
npm install
npx playwright install
```

Create `.env` from `.env.example`.

## Run

All current tests:

```bash
npm test
```

Headed:

```bash
npm run test:headed
```

Safari desktop PDP smoke test:

```bash
npm run test:safari
```

Microsoft Edge PDP smoke test:

```bash
npm run test:edge
```

Firefox PDP smoke test:

```bash
npm run test:firefox
```

UI mode:

```bash
npm run test:ui
```

Debug:

```bash
npm run test:debug
```

P0 tests:

```bash
npm run test:p0
```

HTML report:

```bash
npm run report
```

TypeScript validation:

```bash
npm run typecheck
```

## Reporting

Playwright generates an HTML report containing:
- Passed tests
- Failed tests
- Test duration
- Error details
- Screenshots on failure
- Video on failure
- Trace on failure

## Important approach

Each requirement from the supplied test-case list will become an individual test case, for example:

TC001 -> product page loads
TC002 -> correct product title
TC003 -> correct selling price
...

Tests will be added one by one so each requirement can be validated independently.

Do not combine unrelated requirements into a single test unless a later requirement technically depends on an earlier state.
