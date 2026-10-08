import { test, expect } from '@fixtures/test-fixtures';
import { environment } from '@config/environment';

for (const productUrl of environment.pdpUrls) {
  const productName = productUrl.includes('chocolate-sea-salt')
    ? 'Chocolate Sea Salt'
    : 'Vanilla Almond';
  const alternateVariant =
    productName === 'Chocolate Sea Salt' ? 'Vanilla Almond' : 'Chocolate Sea Salt';
  const analyticsProductIds =
    productName === 'Chocolate Sea Salt'
      ? { productId: '9579513512191', variantId: '48849155227903' }
      : { productId: '9579514527999', variantId: '48849162535167' };
  const alternateVariantId =
    productName === 'Chocolate Sea Salt' ? '48849162535167' : '48849155227903';

  test.describe(`PDP - Product page validation for ${productName}`, () => {
    test(`TC001 - Product page loads without errors @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      const response = await page.goto(productUrl, {
        waitUntil: 'domcontentloaded'
      });

      expect(response, 'Product page should return an HTTP response').not.toBeNull();
      expect(
        response!.status(),
        'Product page should return a successful HTTP status'
      ).toBeGreaterThanOrEqual(200);
      expect(response!.status()).toBeLessThan(400);

      await productPage.expectPageToLoadSuccessfully();
      await expect(page).toHaveURL(/\/products\//);
      await productPage.expectProductPageLoaded();
    });

    test(`TC079 - Product page works in Microsoft Edge @P0 @PDP`, async ({
      page,
      productPage
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'edge', 'This smoke test is specific to Microsoft Edge');
      const response = await page.goto(productUrl, {
        waitUntil: 'domcontentloaded'
      });

      expect(response, 'Product page should return an HTTP response').not.toBeNull();
      expect(response!.status()).toBeGreaterThanOrEqual(200);
      expect(response!.status()).toBeLessThan(400);
      await productPage.expectPageToLoadSuccessfully();
      await expect(page).toHaveURL(/\/products\//);
      await productPage.expectProductTitleDisplayed(productName);
      await expect(productPage.productPrice).toBeVisible();
    });

    test(`TC080 - Product page works in Firefox @P0 @PDP`, async ({
      page,
      productPage
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'firefox', 'This smoke test is specific to Firefox');
      const response = await page.goto(productUrl, {
        waitUntil: 'domcontentloaded'
      });

      expect(response, 'Product page should return an HTTP response').not.toBeNull();
      expect(response!.status()).toBeGreaterThanOrEqual(200);
      expect(response!.status()).toBeLessThan(400);
      await productPage.expectPageToLoadSuccessfully();
      await expect(page).toHaveURL(/\/products\//);
      await productPage.expectProductTitleDisplayed(productName);
      await expect(productPage.productPrice).toBeVisible();
    });

    test(`TC002 - Correct product title displayed @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectProductTitleDisplayed(productName);
    });

    test(`TC003 - Correct selling price displayed @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectSellingPriceDisplayed();
    });

    test(`TC104 - Compare-at price and discount display correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectDisplayedCompareAtPriceAndDiscount(productName);
    });

    test(`TC004 - Correct currency displayed @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectCurrencyDisplayed();
    });

    test(`TC005 - Correct product image updates on variant change @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectProductImageChangesOnVariantChange(alternateVariant);
    });

    test(`TC006 - Sold-out variants are disabled or clearly marked @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectSoldOutVariantsAreHandled();
    });

    test(`TC039 - Low-stock messaging is correct when present @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasLowStockMessage = await productPage.expectLowStockMessageIsCorrect();
      test.skip(!hasLowStockMessage, 'The selected product is not currently showing low-stock messaging');
    });

    test.fixme(`TC007 - Add to Cart works for ${productName} variant @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectAddToCartWorks();
      await productPage.expectCartProductAndVariant(productName);
    });

    test.fixme(`TC008 - Correct product enters cart @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectAddToCartWorks();
      await productPage.expectCartProductAndVariant(productName);
    });

    test.fixme(`TC009 - Correct variant enters cart @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.selectVariant(alternateVariant);
      await productPage.expectAddToCartWorks();
      await productPage.expectCartProductAndVariant(alternateVariant);
    });

    test.fixme(`TC010 - Correct quantity enters cart add 2 quantity by clicking + icon @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectAddToCartWorks();
      await productPage.expectCartQuantityAndPrice(productName, 2);
    });

    test.fixme(`TC011 - Correct price reaches cart @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectAddToCartWorks();
      await productPage.expectCartQuantityAndPrice(productName, 2);
    });

    test.fixme(`TC012 - Cart drawer/page updates correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectAddToCartWorks();
      await productPage.expectCartProductAndVariant(productName);
      await productPage.expectCartCountUpdates();
    });

    test.fixme(`TC013 - Cart count updates correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectAddToCartWorks();
      await productPage.expectCartCountUpdates();
    });

    test(`TC014 - Rapid ATC clicks do not duplicate a 40-item cart line @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectRapidAddToCartKeepsQuantity(40);
    });

    test.fixme(`TC015 - Sold-out product cannot be added to cart @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectSoldOutVariantsAreHandled();
    });

    test(`TC016 - Buy Now passes the correct variant and quantity to checkout @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectBuyNowStartsCheckout(productName, 2);
    });

    test(`TC017 - Quantity selectors update correctly and cannot go below 1 on PDP and side cart @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectQuantitySelectorsWorkInPdpAndSideCart(productName);
    });

    test(`TC018 - Invalid manual quantity characters are rejected on PDP and side cart @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectInvalidManualQuantityIsRejected(productName);
    });

    test(`TC019 - Subscription product adds the correct selling plan to cart @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectSubscriptionSellingPlanInCart(productName);
    });

    test(`TC020 - One-time purchase selection adds the correct product to cart @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectOneTimePurchaseInCart(productName);
    });

    test(`TC021 - Subscription pricing and discount are correct @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectSubscriptionPricingAndDiscount(productName);
    });

    test(`TC022 - Checkout handoff preserves product, variant, quantity, and price @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectCartDataTransfersToCheckout(productName);
    });

    test(`TC023 - PDP works in Safari desktop @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      const response = await page.goto(productUrl, {
        waitUntil: 'domcontentloaded'
      });

      expect(response, 'Product page should return an HTTP response').not.toBeNull();
      expect(response!.status()).toBeGreaterThanOrEqual(200);
      expect(response!.status()).toBeLessThan(400);

      await productPage.expectPageToLoadSuccessfully();
      await expect(page).toHaveURL(/\/products\//);
      await productPage.expectProductTitleDisplayed(productName);
      await expect(productPage.productPrice).toBeVisible();
    });

    test(`TC024 - view_item analytics event fires correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectProductTitleDisplayed(productName);

      await productPage.expectViewItemAnalyticsEvent(productName);
    });

    test(`TC025 - add_to_cart analytics event fires correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectProductTitleDisplayed(productName);

      await productPage.expectAddToCartAnalyticsEvent(productName, 2);
    });

    test(`TC026 - begin_checkout analytics event fires correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectProductTitleDisplayed(productName);

      await productPage.expectBeginCheckoutAnalyticsEvent(productName, 2);
    });

    test(`TC027 - Analytics passes correct product/variant IDs, price, and currency @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectProductTitleDisplayed(productName);

      await productPage.expectAnalyticsProductId(
        productName,
        analyticsProductIds.productId,
        analyticsProductIds.variantId
      );
    });

    test(`TC028 - Analytics events fire only once per user action @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectProductTitleDisplayed(productName);

      await productPage.expectAnalyticsEventsFireOnce(productName);
    });

    test(`TC029 - Product description displays correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductDescriptionDisplayed(productName);
    });

    test(`TC030 - Product images load correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductImagesLoad(productName);
    });

    test(`TC081 - Above-fold product hero image is not lazy-loaded @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(productUrl, { waitUntil: 'load' });
      await productPage.expectPageToLoadSuccessfully();
      await productPage.expectProductTitleDisplayed(productName);

      await productPage.expectProductHeroImageLoadsEfficiently();
    });

    test(`TC082 - Product page has no major layout shifts @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript(() => {
        const layoutShiftEntries: Array<{ value: number; hadRecentInput: boolean }> = [];
        const layoutShiftSupported =
          PerformanceObserver.supportedEntryTypes.includes('layout-shift');
        Object.assign(window, {
          __layoutShiftEntries: layoutShiftEntries,
          __layoutShiftSupported: layoutShiftSupported
        });

        if (layoutShiftSupported) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const layoutShift = entry as PerformanceEntry & {
                value: number;
                hadRecentInput: boolean;
              };
              layoutShiftEntries.push({
                value: layoutShift.value,
                hadRecentInput: layoutShift.hadRecentInput
              });
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
        }
      });
      await page.goto(productUrl, { waitUntil: 'load' });
      await productPage.expectPageToLoadSuccessfully();
      await page.waitForTimeout(2000);

      const supportsLayoutShiftEntries = await page.evaluate(() =>
        PerformanceObserver.supportedEntryTypes.includes('layout-shift')
      );
      test.skip(
        !supportsLayoutShiftEntries,
        'This browser does not expose the Layout Instability API'
      );
      await productPage.expectCumulativeLayoutShiftBelow(0.1);
      await productPage.expectCumulativeLayoutShiftBelow(0.1);
    });
    test(`TC083 - Third-party scripts do not noticeably block PDP @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectThirdPartyScriptsDoNotBlockPdp(productName);
    });

    test(`TC084 - Product structured data exists @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductStructuredData(productName);
    });

    test(`TC085 - Schema price matches the displayed price @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductSchemaPriceMatchesDisplayedPrice(productName);
    });

    test(`TC086 - Schema availability matches the live variant @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductSchemaAvailabilityMatchesLiveVariant(productName);
    });

    test(`TC087 - Review schema matches the review widget @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectReviewSchemaMatchesReviewWidget(productName);
    });

    test(`TC088 - Canonical URL matches the product page @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductCanonicalUrl(productName);
    });

    test(`TC089 - Meta title matches the product @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductMetaTitle(productName);
    });

    test(`TC090 - Meta description matches the product @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductMetaDescription(productName);
    });

    test(`TC091 - UTM parameters do not break PDP behavior @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      const trackingUrl = new URL(productUrl);
      trackingUrl.searchParams.set('utm_source', 'playwright');
      trackingUrl.searchParams.set('utm_medium', 'regression');
      trackingUrl.searchParams.set('utm_campaign', 'pdp-query-check');
      await page.goto(trackingUrl.toString(), { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectUtmParametersDoNotBreakPdp(productName, alternateVariant);
    });

    test(`TC092 - PDP remains usable on a slow network @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      let delayedFirstPartyRequests = 0;
      const storeOrigin = new URL(productUrl).origin;
      await page.route('**/*', async (route) => {
        if (new URL(route.request().url()).origin === storeOrigin) {
          delayedFirstPartyRequests += 1;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        await route.continue();
      });

      const response = await page.goto(productUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      expect(response, 'The PDP should return a response under added latency').not.toBeNull();
      expect(response!.status()).toBeGreaterThanOrEqual(200);
      expect(response!.status()).toBeLessThan(400);
      await productPage.expectPageToLoadSuccessfully();
      expect(
        delayedFirstPartyRequests,
        'The test should apply latency to first-party requests'
      ).toBeGreaterThan(0);

      await productPage.expectPdpRemainsUsableOnSlowNetwork(productName);
    });

    test(`TC093 - Variant change during Add to Cart keeps the submitted variant @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectVariantChangeDuringAddToCartKeepsSubmittedVariant(
        productName,
        analyticsProductIds.variantId,
        alternateVariant,
        alternateVariantId
      );
    });

    test(`TC094 - Going offline during Add to Cart fails gracefully @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectAddToCartRecoversAfterGoingOffline(productName);
    });

    test(`TC095 - Vendor displays correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductVendor(productName, 'Tilt');
    });

    test(`TC096 - Product type displays correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductTypeDisplays(productName, 'protein-bars', 'Protein Bars');
    });

    test(`TC097 - Tags display correctly where used @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductTagsDisplayCorrectly(productName);
    });

    test(`TC098 - Breadcrumb schema is correct @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectBreadcrumbSchema(productName);
    });

    test(`TC031 - All product thumbnails work @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectAllProductThumbnailsWork(productName);
    });

    test(`TC032 - Mobile product gallery swipe animates smoothly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductGallerySwipeWorks(productName);
    });

    test(`TC033 - Product image zoom and lightbox work @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductImageLightboxWorks(productName);
    });

    test(`TC034 - Product videos play correctly when available @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasProductVideo = await productPage.prepareProductVideoForPlayback();
      test.skip(!hasProductVideo, 'This product page has no playable gallery video');
      await productPage.expectProductVideoPlaybackWorks();
    });

    test(`TC035 - Different product image aspect ratios do not break gallery layout @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectDifferentImageAspectRatiosKeepLayout();
    });

    test(`TC036 - Variant selection updates the product URL correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectVariantUrlUpdates(alternateVariant);
    });

    test(`TC037 - Shared variant URL opens the correct product @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectSharedVariantUrlOpensCorrectVariant(alternateVariant);
    });

    test(`TC038 - Selected variant survives page refresh @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectSelectedVariantSurvivesRefresh(alternateVariant);
    });

    test(`TC040 - Flavor color swatches map to the correct variants @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectFlavorSwatchesMapToVariants(productName, alternateVariant);
    });

    test(`TC041 - Selected flavor swatch state is visually obvious @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectSelectedFlavorSwatchIsObvious(productName, alternateVariant);
    });

    test(`TC042 - Unavailable flavor swatches are disabled @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasUnavailableSwatches =
        await productPage.expectUnavailableFlavorSwatchesAreDisabled();
      test.skip(
        !hasUnavailableSwatches,
        'No unavailable flavor swatches are currently shown for this product'
      );
    });

    test(`TC043 - Size options map correctly when available @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasSizeOptions = await productPage.expectSizeOptionsMapCorrectly();
      test.skip(!hasSizeOptions, 'This product page has no selectable size options');
    });

    test(`TC044 - Size chart opens correctly when available @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasSizeChart = await productPage.expectSizeChartOpens();
      test.skip(!hasSizeChart, 'This product page does not provide a size chart');
    });

    test(`TC045 - Correct product or category size chart is shown when available @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasSizeChart =
        await productPage.expectSizeChartMatchesProductOrCategory(productName);
      test.skip(!hasSizeChart, 'This product page does not provide a product/category size chart');
    });

    test(`TC046 - Product metafields display correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasMetafields = await productPage.expectProductMetafieldsDisplayCorrectly();
      test.skip(!hasMetafields, 'This product page does not render product metafields');
    });

    test(`TC047 - Empty metafields do not create empty sections @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectEmptyMetafieldsDoNotCreateSections();
    });

    test(`TC048 - Long metafield content does not break layout @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasLongMetafield = await productPage.expectLongMetafieldContentDoesNotBreakLayout();
      test.skip(!hasLongMetafield, 'No long product metafield content is available');
    });

    test(`TC049 - Rich-text metafields render correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasRichText = await productPage.expectRichTextMetafieldsRenderCorrectly();
      test.skip(!hasRichText, 'This product page has no non-empty rich-text metafields');
    });

    test(`TC050 - Metafield metaobjects and references load correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasReferences = await productPage.expectMetafieldReferencesLoadCorrectly();
      test.skip(!hasReferences, 'This product page has no rendered metafield references');
    });

    test(`TC051 - Product-specific specifications are correct @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductSpecificSpecifications(productName);
    });

    test(`TC052 - Product accordions open and close correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductAccordionsOpenAndClose();
    });

    test(`TC077 - Product accordions are usable on mobile @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductAccordionsAreUsableOnMobile();
    });

    test(`TC053 - Shipping accordion content is correct @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectShippingAccordionsAreCorrect();
    });

    test(`TC054 - Returns accordion content is correct when available @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasReturnsAccordion = await productPage.expectReturnsAccordionIsCorrect();
      test.skip(!hasReturnsAccordion, 'This product page has no returns or refund accordion');
    });

    test(`TC055 - Product FAQs display correctly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductFaqsDisplayCorrectly(productName);
    });

    test(`TC056 - Product review rating is correct @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductReviewRatingIsCorrect(analyticsProductIds.productId);
    });

    test(`TC057 - Product review count is correct @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductReviewCountIsCorrect(analyticsProductIds.productId);
    });

    test(`TC058 - Clicking review stars navigates to reviews @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectReviewStarsNavigateToReviews(analyticsProductIds.productId);
    });

    test(`TC059 - Review summary handles zero-review state safely @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectProductReviewSummaryHandlesZeroReviews(
        analyticsProductIds.productId
      );
    });

    test(`TC060 - Large number of reviews does not break page layout @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectLargeReviewVolumeDoesNotBreakLayout(
        analyticsProductIds.productId
      );
    });

    test(`TC061 - Review filtering and sorting work @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectReviewFilteringAndSortingWork(analyticsProductIds.productId);
    });

    test(`TC062 - Review pagination works @P0 @PDP`, async ({ page, productPage }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectReviewPaginationWorks(analyticsProductIds.productId);
    });

    test(`TC076 - Reviews are usable on mobile @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectReviewsAreUsableOnMobile(analyticsProductIds.productId);
    });

    test(`TC063 - Subscription frequency option works @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectSubscriptionFrequencyOptionWorks();
    });

    test(`TC064 - Variant change preserves subscription selection @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectVariantChangePreservesSubscriptionSelection(alternateVariant);
    });

    test(`TC065 - Frequently Bought Together adds both flavors @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectFrequentlyBoughtTogetherAddsBothVariants(
        productName,
        alternateVariant
      );
    });

    test(`TC066 - Upsell products are correct @P0 @PDP`, async ({ page, productPage }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectUpsellProductsAreCorrect(
        productName,
        alternateVariant,
        analyticsProductIds.variantId,
        alternateVariantId
      );
    });

    test(`TC067 - Sold-out upsell items are not purchasable @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasSoldOutUpsellItem = await productPage.expectSoldOutUpsellItemsAreNotPurchasable(
        productName,
        alternateVariant,
        analyticsProductIds.variantId,
        alternateVariantId
      );
      test.skip(!hasSoldOutUpsellItem, 'Both products in the upsell are currently available');
    });

    test(`TC068 - Cross-sell items update with the selected flavor @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectUpsellProductsAreCorrect(
        productName,
        alternateVariant,
        analyticsProductIds.variantId,
        alternateVariantId
      );

      await productPage.selectVariant(alternateVariant);

      await productPage.expectUpsellProductsAreCorrect(
        alternateVariant,
        productName,
        alternateVariantId,
        analyticsProductIds.variantId
      );
    });

    test(`TC069 - Quantity discount logic is correct @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectQuantityDiscountLogicIsCorrect();
    });

    test(`TC070 - Higher-quantity pricing follows configured discounts @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectQuantityPricingAtHigherQuantities();
    });

    test(`TC071 - Multiple promotions do not conflict unexpectedly @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectMultiplePromotionsDoNotConflict();
    });

    test(`TC072 - Estimated delivery date matches published shipping window @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasDeliveryEstimate =
        await productPage.expectEstimatedDeliveryDateMatchesShippingPolicy();
      test.skip(
        !hasDeliveryEstimate,
        'The PDP does not currently display a method-specific delivery estimate'
      );
    });

    test(`TC073 - Postal-code checker responds @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      const hasPostalCodeChecker = await productPage.expectPostalCodeCheckerResponds();
      test.skip(!hasPostalCodeChecker, 'The PDP does not currently provide a postal-code checker');
    });

    test(`TC074 - Checkout postal-code checker updates shipping options @P0 @Checkout`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectCheckoutPostalCodeCheckerResponds(productName);
    });

    test(`TC075 - U.S. market checkout pricing matches the product price @P0 @Checkout`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectUsMarketCheckoutPricingMatchesProduct(productName);
    });

    test(`TC078 - Popups do not block important PDP actions @P0 @PDP`, async ({
      page,
      productPage
    }) => {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
      await productPage.expectPageToLoadSuccessfully();

      await productPage.expectPopupsDoNotBlockPdpActions(productName);
    });
  });
}
