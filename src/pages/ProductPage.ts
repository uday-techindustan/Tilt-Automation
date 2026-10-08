import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  readonly productTitle = this.page.locator('h1').first();
  readonly productFlavorOptions = this.page.locator('.product-flavour-picker__item');
  readonly productPrice = this.page.locator('.product-subscription-buy-box__current-price').first();
  readonly subscriptionLabel = this.page.locator('label:has-text("Subscribe & Save 10%")').first();
  readonly oneTimeLabel = this.page.locator('label:has-text("One-time purchase")').first();
  readonly addToCartButton = this.page.locator('button:has-text("Add to Cart")').first();
  readonly buyNowButton = this.page.getByRole('link', { name: /buy now/i }).first();

  constructor(page: Page) {
    super(page);
  }

  async open(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async selectVariant(variantName: string): Promise<void> {
    const variant = this.productFlavorOptions.filter({ hasText: variantName }).first();
    await expect(variant).toBeVisible();
    await variant.click();
    await this.page.waitForTimeout(1200);
    await expect(this.productTitle).toHaveText(new RegExp(variantName, 'i'));
  }

  async expectVariantUrlUpdates(expectedVariant: string): Promise<void> {
    const expectedSlug = expectedVariant.toLowerCase().replace(/\s+/g, '-');
    const variant = this.productFlavorOptions.filter({ hasText: expectedVariant }).first();

    await expect(variant).toBeVisible();
    await variant.click();
    await expect(this.page).toHaveURL(
      new RegExp(`/products/${expectedSlug}(?:[?#]|$)`)
    );
    await expect(this.productTitle).toHaveText(new RegExp(expectedVariant, 'i'));

    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(
      new RegExp(`/products/${expectedSlug}(?:[?#]|$)`)
    );
    await expect(this.productTitle).toHaveText(new RegExp(expectedVariant, 'i'));
  }

  async expectFlavorSwatchesMapToVariants(
    currentVariant: string,
    alternateVariant: string
  ): Promise<void> {
    const variants = [currentVariant, alternateVariant];
    const expectedCurrentPath = `/products/${currentVariant.toLowerCase().replace(/\s+/g, '-')}`;
    const activeOption = this.page.locator(
      '.product-flavour-picker__option.product-flavour-picker__option--active'
    );

    await expect(this.productFlavorOptions).toHaveCount(variants.length);
    for (const variantName of variants) {
      const option = this.productFlavorOptions.filter({ hasText: variantName }).first();
      const swatch = option.locator('.product-flavour-picker__option');
      const swatchImage = swatch.locator('img');
      const expectedPath = `/products/${variantName.toLowerCase().replace(/\s+/g, '-')}`;

      await expect(option).toBeVisible();
      await expect(swatchImage).toHaveAttribute('alt', variantName);
      await expect(swatch).toHaveAttribute('href', expectedPath);
    }

    await expect(activeOption).toHaveAttribute('href', expectedCurrentPath);
    await expect(activeOption.locator('img')).toHaveAttribute('alt', currentVariant);

    const alternateOption = this.productFlavorOptions
      .filter({ hasText: alternateVariant })
      .first()
      .locator('.product-flavour-picker__option');
    await alternateOption.click();
    await expect(this.page).toHaveURL(
      new RegExp(`/products/${alternateVariant.toLowerCase().replace(/\s+/g, '-')}(?:[?#]|$)`)
    );
    await expect(this.productTitle).toHaveText(new RegExp(alternateVariant, 'i'));
    await expect(activeOption).toHaveAttribute(
      'href',
      `/products/${alternateVariant.toLowerCase().replace(/\s+/g, '-')}`
    );
    await expect(activeOption.locator('img')).toHaveAttribute('alt', alternateVariant);
  }

  async expectSelectedFlavorSwatchIsObvious(
    currentVariant: string,
    alternateVariant: string
  ): Promise<void> {
    const assertSelectedSwatchIsDistinct = async (selectedVariant: string) => {
      const swatchStates = await this.productFlavorOptions.evaluateAll((options) =>
        options.map((option) => {
          const swatch = option.querySelector('.product-flavour-picker__option');
          const style = swatch ? window.getComputedStyle(swatch) : null;

          return {
            variant: swatch?.querySelector('img')?.getAttribute('alt') ?? '',
            selected: swatch?.classList.contains('product-flavour-picker__option--active') ?? false,
            borderColor: style?.borderTopColor ?? '',
            borderWidth: style?.borderTopWidth ?? '0px',
            borderStyle: style?.borderTopStyle ?? 'none'
          };
        })
      );

      expect(swatchStates.filter((swatch) => swatch.selected)).toHaveLength(1);
      const selectedSwatch = swatchStates.find((swatch) => swatch.selected);
      const unselectedSwatch = swatchStates.find((swatch) => !swatch.selected);

      expect(selectedSwatch?.variant).toBe(selectedVariant);
      expect(unselectedSwatch, 'A selected flavor should have an unselected flavor to compare').toBeDefined();
      expect(selectedSwatch?.borderStyle).not.toBe('none');
      expect(Number.parseFloat(selectedSwatch?.borderWidth ?? '0')).toBeGreaterThan(0);
      expect(selectedSwatch?.borderColor).not.toBe(unselectedSwatch?.borderColor);

      const borderOpacity = (color: string) => {
        const rgbaAlpha = color.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/i);
        return rgbaAlpha ? Number(rgbaAlpha[1]) : 1;
      };
      expect(borderOpacity(selectedSwatch?.borderColor ?? '')).toBeGreaterThan(
        borderOpacity(unselectedSwatch?.borderColor ?? '')
      );
    };

    await assertSelectedSwatchIsDistinct(currentVariant);

    const alternateSwatch = this.productFlavorOptions
      .filter({ hasText: alternateVariant })
      .first()
      .locator('.product-flavour-picker__option');
    await alternateSwatch.click();
    await expect(this.page).toHaveURL(
      new RegExp(`/products/${alternateVariant.toLowerCase().replace(/\s+/g, '-')}(?:[?#]|$)`)
    );
    await assertSelectedSwatchIsDistinct(alternateVariant);
  }

  async expectUnavailableFlavorSwatchesAreDisabled(): Promise<boolean> {
    const swatchStates = await this.productFlavorOptions.evaluateAll((options) =>
      options.map((option) => {
        const swatch = option.querySelector('.product-flavour-picker__option');
        if (!swatch) {
          return null;
        }

        const text = `${option.textContent ?? ''} ${swatch.getAttribute('aria-label') ?? ''} ${
          swatch.getAttribute('title') ?? ''
        }`;
        const className =
          typeof swatch.className === 'string' ? swatch.className : '';
        const explicitlyUnavailable =
          /\b(?:sold\s*out|unavailable|out\s*of\s*stock)\b/i.test(text) ||
          /\b(?:sold[-_ ]?out|unavailable|disabled)\b/i.test(className) ||
          swatch.getAttribute('aria-disabled') === 'true' ||
          swatch.hasAttribute('disabled');

        if (!explicitlyUnavailable) {
          return null;
        }

        const style = window.getComputedStyle(swatch);
        return {
          variant: swatch.querySelector('img')?.getAttribute('alt') ?? text.trim(),
          isAnchor: swatch.tagName === 'A',
          hasHref: swatch.hasAttribute('href'),
          disabledAttribute: swatch.hasAttribute('disabled'),
          ariaDisabled: swatch.getAttribute('aria-disabled'),
          pointerEvents: style.pointerEvents,
          className
        };
      })
    );
    const unavailableSwatches = swatchStates.filter(
      (swatch): swatch is NonNullable<typeof swatch> => swatch !== null
    );

    if (unavailableSwatches.length === 0) {
      return false;
    }

    for (const swatch of unavailableSwatches) {
      const isSemanticallyDisabled =
        swatch.disabledAttribute || swatch.ariaDisabled === 'true';
      const isNonInteractive =
        !swatch.isAnchor ||
        !swatch.hasHref ||
        swatch.pointerEvents === 'none' ||
        isSemanticallyDisabled;

      expect(
        isNonInteractive,
        `Unavailable swatch "${swatch.variant}" must not remain an active link`
      ).toBe(true);
      expect(
        /\b(?:sold[-_ ]?out|unavailable|disabled)\b/i.test(swatch.className) ||
          isSemanticallyDisabled ||
          swatch.pointerEvents === 'none',
        `Unavailable swatch "${swatch.variant}" should expose a disabled state`
      ).toBe(true);
    }

    return true;
  }

  async expectSizeOptionsMapCorrectly(): Promise<boolean> {
    const sizeGroups = this.page
      .locator('.product__info-container fieldset')
      .filter({ has: this.page.locator('legend').filter({ hasText: /^\s*size\b/i }) });

    if ((await sizeGroups.count()) === 0 || !(await sizeGroups.first().isVisible())) {
      return false;
    }

    const sizeOptions = sizeGroups.first().locator('input[type="radio"]');
    const optionCount = await sizeOptions.count();
    if (optionCount < 2) {
      return false;
    }

    const labels = new Set<string>();
    const values = new Set<string>();

    for (let index = 0; index < optionCount; index++) {
      const option = sizeOptions.nth(index);
      const value = await option.getAttribute('value');
      const id = await option.getAttribute('id');
      const label = id
        ? this.page.locator(`label[for="${id}"]`)
        : option.locator('xpath=..');
      const labelText = (await label.innerText()).replace(/\s+/g, ' ').trim();

      expect(value, 'Each size option should map to a variant value').toBeTruthy();
      expect(labelText, 'Each size option should have a visible label').toBeTruthy();
      expect(labels.has(labelText), 'Size labels should identify distinct options').toBe(false);
      expect(values.has(value ?? ''), 'Size options should map to distinct variant values').toBe(
        false
      );
      labels.add(labelText);
      values.add(value ?? '');

      await label.click();
      await expect(option).toBeChecked();
    }

    return true;
  }

  async expectSizeChartOpens(): Promise<boolean> {
    const trigger = this.page
      .locator('.product__info-container button, .product__info-container a')
      .filter({ hasText: /size\s*chart/i })
      .first();

    if ((await trigger.count()) === 0 || !(await trigger.isVisible())) {
      return false;
    }

    await trigger.click();

    const chart = this.page
      .locator(
        '[role="dialog"]:visible, dialog[open], [class*="size-chart"]:visible, [id*="size-chart"]:visible, [id*="SizeChart"]:visible'
      )
      .first();
    await expect(chart, 'The size chart should open and be visible').toBeVisible();
    await expect(chart, 'The size chart should contain content').not.toBeEmpty();

    return true;
  }

  async expectSizeChartMatchesProductOrCategory(productName: string): Promise<boolean> {
    const trigger = this.page
      .locator('.product__info-container button, .product__info-container a')
      .filter({ hasText: /size\s*chart/i })
      .first();

    if ((await trigger.count()) === 0 || !(await trigger.isVisible())) {
      return false;
    }

    await trigger.click();
    const chart = this.page
      .locator(
        '[role="dialog"]:visible, dialog[open], [class*="size-chart"]:visible, [id*="size-chart"]:visible, [id*="SizeChart"]:visible'
      )
      .first();
    await expect(chart, 'The size chart should open and be visible').toBeVisible();

    const chartText = (await chart.innerText()).replace(/\s+/g, ' ').trim();
    expect(chartText, 'The size chart should identify the product or its category').toMatch(
      new RegExp(`${productName}|protein\\s+bars?`, 'i')
    );

    return true;
  }

  async expectSelectedVariantSurvivesRefresh(expectedVariant: string): Promise<void> {
    const expectedSlug = expectedVariant.toLowerCase().replace(/\s+/g, '-');
    const expectedPath = `/products/${expectedSlug}`;
    const variant = this.productFlavorOptions.filter({ hasText: expectedVariant }).first();
    const activeVariant = this.page.locator('.product-flavour-picker__option--active');

    await expect(variant).toBeVisible();
    await variant.click();
    await expect(this.page).toHaveURL(new RegExp(`${expectedPath}(?:[?#]|$)`));
    await expect(this.productTitle).toHaveText(new RegExp(expectedVariant, 'i'));
    await expect(activeVariant).toHaveAttribute('href', expectedPath);
    await expect(activeVariant).toContainText(expectedVariant);

    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(new RegExp(`${expectedPath}(?:[?#]|$)`));
    await expect(this.productTitle).toHaveText(new RegExp(expectedVariant, 'i'));
    await expect(activeVariant).toHaveAttribute('href', expectedPath);
    await expect(activeVariant).toContainText(expectedVariant);
  }

  async expectSharedVariantUrlOpensCorrectVariant(expectedVariant: string): Promise<void> {
    const expectedSlug = expectedVariant.toLowerCase().replace(/\s+/g, '-');
    const variant = this.productFlavorOptions.filter({ hasText: expectedVariant }).first();
    await expect(variant).toBeVisible();
    await variant.click();
    await expect(this.productTitle).toHaveText(new RegExp(expectedVariant, 'i'));

    const sharedUrl = this.page.url();
    const sharedPage = await this.page.context().newPage();

    try {
      const response = await sharedPage.goto(sharedUrl, { waitUntil: 'domcontentloaded' });
      expect(response, 'The shared variant URL should return an HTTP response').not.toBeNull();
      expect(response!.status(), 'The shared variant URL should load successfully').toBeLessThan(
        400
      );
      await expect(sharedPage).toHaveURL(
        new RegExp(`/products/${expectedSlug}(?:[?#]|$)`)
      );
      await expect(sharedPage.locator('h1').first()).toHaveText(new RegExp(expectedVariant, 'i'));
    } finally {
      await sharedPage.close();
    }
  }

  async expectProductPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/products\//);
    await expect(this.productTitle).toBeVisible();
    await expect(this.productTitle).not.toHaveText('');
    await expect(this.productPrice).toBeVisible();
  }

  async expectProductTitleDisplayed(expectedTitle: string): Promise<void> {
    await expect(this.productTitle).toBeVisible();
    await expect(this.productTitle).toHaveText(new RegExp(expectedTitle, 'i'));

    const alternativeFlavor =
      expectedTitle.toLowerCase().includes('vanilla') ? 'Chocolate Sea Salt' : 'Vanilla Almond';

    await expect(this.page.getByText(alternativeFlavor).first()).toBeVisible();
    await expect(this.productFlavorOptions.filter({ hasText: expectedTitle }).first()).toBeVisible();
  }

  async expectProductDescriptionDisplayed(productName: string): Promise<void> {
    const descriptionButton = this.page.getByRole('button', { name: /^Description/i });
    await expect(descriptionButton).toBeVisible();
    await expect(descriptionButton).toHaveAttribute('aria-expanded', 'true');

    const descriptionContent = descriptionButton
      .locator('xpath=ancestor::details[1]')
      .locator('.accordion__content');
    await expect(descriptionContent).toBeVisible();

    const flavorCopy =
      productName === 'Chocolate Sea Salt'
        ? {
            opening: 'Rich chocolate. Crisp sea salt.',
            productDescription:
              'this protein bar with probiotics goes beyond fueling your day.'
          }
        : {
            opening: 'Smooth vanilla. Crunchy almonds.',
            productDescription: 'this high protein bar goes beyond fueling your day.'
          };

    await expect(descriptionContent).toContainText(flavorCopy.opening);
    await expect(descriptionContent).toContainText(
      `With 28g of protein, 6g of prebiotic fiber, and clinically-proven probiotics`
    );
    await expect(descriptionContent).toContainText(flavorCopy.productDescription);
    await expect(descriptionContent).toContainText('It helps keep your gut balanced and your body moving strong.');
    await expect(descriptionContent).toContainText('Macros & Benefits:');
    await expect(descriptionContent).toContainText('28g protein, 6g fiber, 5g net carbs');
    await expect(descriptionContent).toContainText(
      'Clinically-proven probiotics + prebiotic fiber for gut health'
    );
    await expect(descriptionContent).toContainText(
      'Formulated to help your body maximize protein absorption'
    );
    await expect(descriptionContent).toContainText(
      'No artificial ingredients, sweeteners, seed oils, or fillers'
    );
    await expect(descriptionContent).toContainText(
      'Whey + hydrolyzed collagen for muscles and recovery'
    );
  }

  async expectProductFaqsDisplayCorrectly(productName: string): Promise<void> {
    const faq = this.page.locator('.section-faq');
    await expect(faq).toBeVisible();

    const productTab = faq.getByRole('tab', { name: 'Product', exact: true });
    const subscriptionTab = faq.getByRole('tab', { name: 'Subscription', exact: true });
    const shippingTab = faq.getByRole('tab', { name: 'Shipping', exact: true });
    const panels = [
      {
        name: 'product',
        tab: productTab,
        expectedCount: productName === 'Chocolate Sea Salt' ? 5 : 6
      },
      { name: 'subscription', tab: subscriptionTab, expectedCount: 5 },
      { name: 'shipping', tab: shippingTab, expectedCount: 5 }
    ];

    for (const panelInfo of panels) {
      await expect(panelInfo.tab).toBeVisible();
      await panelInfo.tab.click();
      await expect(panelInfo.tab).toHaveClass(/is-active/);

      const panel = faq.locator(`[data-tab-panel="${panelInfo.name}"]`);
      await expect(panel).toBeVisible();
      const questions = panel.locator('.section-faq__item');
      await expect(questions).toHaveCount(panelInfo.expectedCount);

      for (let index = 0; index < panelInfo.expectedCount; index++) {
        const question = questions.nth(index);
        const summary = question.locator('summary');
        const questionText = (await summary.innerText()).replace(/\s+/g, ' ').trim();
        const answer = question.locator('.section-faq__answer');
        const answerText = (await answer.textContent())?.replace(/\s+/g, ' ').trim() ?? '';

        expect(questionText, `${panelInfo.name} FAQ ${index + 1} should have a question`).not.toBe(
          ''
        );
        expect(answerText, `"${questionText}" should have an answer`).not.toBe('');

        const isOpen = await question.evaluate(
          (element) => (element as HTMLDetailsElement).open
        );
        if (!isOpen) {
          await summary.click();
        }
        await expect(question).toHaveJSProperty('open', true);
        await expect(answer).toBeVisible();
        await expect(answer).toContainText(answerText);
      }
    }

    const productPanel = faq.locator('[data-tab-panel="product"]');
    const flavorAnswer = productPanel.locator('.section-faq__answer').filter({
      hasText:
      productName === 'Chocolate Sea Salt'
        ? /Chocolate Sea Salt.*rich chocolate flavor.*sea salt/i
        : /Vanilla Almond.*smooth vanilla flavor.*almond crunch/i
    });
    await expect(flavorAnswer).toHaveCount(1);
  }

  async expectProductReviewRatingIsCorrect(expectedProductId: string): Promise<void> {
    const badge = this.page.locator('.jdgm-preview-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-id', expectedProductId);

    const ratingData = badge.locator('.jdgm-prev-badge');
    const averageRatingText = await ratingData.getAttribute('data-average-rating');
    expect(averageRatingText, 'The review widget should provide an average rating').not.toBeNull();
    const averageRating = Number(averageRatingText);
    expect(Number.isFinite(averageRating)).toBe(true);
    expect(averageRating).toBeGreaterThanOrEqual(0);
    expect(averageRating).toBeLessThanOrEqual(5);

    const displayedRating = await badge.locator('.jdgm-prev-badge__text').innerText();
    const ratingMatch = displayedRating.trim().match(/^(\d+(?:\.\d+)?)\s*\(([\d,]+)\)$/);
    expect(ratingMatch, 'The review badge should show a rating and review count').not.toBeNull();
    expect(Number(ratingMatch![1])).toBe(Number(averageRating.toFixed(1)));

    const score = await badge.locator('.jdgm-prev-badge__stars').getAttribute('data-score');
    expect(Number(score), 'The star score should match the underlying average').toBe(averageRating);
  }

  async expectProductReviewCountIsCorrect(expectedProductId: string): Promise<void> {
    const badge = this.page.locator('.jdgm-preview-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-id', expectedProductId);

    const ratingData = badge.locator('.jdgm-prev-badge');
    const reviewCountText = await ratingData.getAttribute('data-number-of-reviews');
    expect(reviewCountText, 'The review widget should provide a review count').not.toBeNull();
    const reviewCount = Number(reviewCountText);
    expect(Number.isInteger(reviewCount)).toBe(true);
    expect(reviewCount).toBeGreaterThan(0);

    const displayedBadge = (await badge.locator('.jdgm-prev-badge__text').innerText()).trim();
    const countMatch = displayedBadge.match(/^\d+(?:\.\d+)?\s*\(([\d,]+)\)$/);
    expect(countMatch, 'The review badge should display its review count').not.toBeNull();
    expect(Number(countMatch![1].replace(/,/g, ''))).toBe(reviewCount);
  }

  async expectProductReviewSummaryHandlesZeroReviews(expectedProductId: string): Promise<void> {
    const badge = this.page.locator('.jdgm-preview-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-id', expectedProductId);

    const ratingData = badge.locator('.jdgm-prev-badge');
    const reviewCountText = await ratingData.getAttribute('data-number-of-reviews');
    expect(reviewCountText, 'The review widget should provide a review count').not.toBeNull();
    const reviewCount = Number(reviewCountText);
    expect(Number.isInteger(reviewCount)).toBe(true);
    expect(reviewCount).toBeGreaterThanOrEqual(0);

    const displayedBadge = (await badge.locator('.jdgm-prev-badge__text').innerText()).trim();
    expect(displayedBadge).not.toMatch(/NaN|Infinity/i);

    if (reviewCount === 0) {
      expect(displayedBadge).toMatch(/\b0\b|no reviews?/i);

      const ratingValues = [
        { element: ratingData, attribute: 'data-average-rating' },
        { element: ratingData.locator('.jdgm-prev-badge__stars'), attribute: 'data-score' }
      ];
      for (const { element, attribute } of ratingValues) {
        const value = await element.getAttribute(attribute);
        if (value !== null) {
          expect(Number.isFinite(Number(value))).toBe(true);
          expect(Number(value), `${attribute} should not show a rating with no reviews`).toBe(0);
        }
      }
      return;
    }

    await this.expectProductReviewRatingIsCorrect(expectedProductId);
    await this.expectProductReviewCountIsCorrect(expectedProductId);
  }

  async expectLargeReviewVolumeDoesNotBreakLayout(expectedProductId: string): Promise<void> {
    const badge = this.page.locator('.jdgm-preview-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-id', expectedProductId);

    const reviewCountText = await badge
      .locator('.jdgm-prev-badge')
      .getAttribute('data-number-of-reviews');
    expect(reviewCountText, 'The review widget should provide a review count').not.toBeNull();
    const reviewCount = Number(reviewCountText);
    expect(Number.isInteger(reviewCount)).toBe(true);
    expect(reviewCount, 'The product should exercise the large-review-count state').toBeGreaterThanOrEqual(
      500
    );
    await this.expectProductReviewCountIsCorrect(expectedProductId);

    const reviewWidget = this.page.locator('#judgeme_product_reviews');
    const reviewHeading = reviewWidget.getByRole('heading', { name: 'What Customers Say' });
    await badge.locator('.jdgm-prev-badge__stars').click();
    await expect(reviewHeading).toBeInViewport();

    const reviewList = reviewWidget.locator('.jdgm-review-list');
    await expect(reviewList).toBeVisible();
    await expect(reviewList.locator(':scope > *').first()).toBeVisible();

    const originalViewport = this.page.viewportSize();
    expect(originalViewport, 'The layout check requires a defined viewport').not.toBeNull();
    if (!originalViewport) {
      return;
    }

    try {
      for (const width of [...new Set([originalViewport.width, 390])]) {
        await this.page.setViewportSize({ width, height: originalViewport.height });
        await reviewWidget.scrollIntoViewIfNeeded();
        const layout = await reviewWidget.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            left: bounds.left,
            right: bounds.right,
            width: bounds.width,
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth
          };
        });

        expect(layout.width, 'The review widget should retain a visible width').toBeGreaterThan(0);
        expect(layout.left, 'The review widget should not overflow the left viewport edge').toBeGreaterThanOrEqual(
          -1
        );
        expect(layout.right, 'The review widget should not overflow the right viewport edge').toBeLessThanOrEqual(
          layout.viewportWidth + 1
        );
        expect(layout.scrollWidth, 'Reviews should not cause horizontal page scrolling').toBeLessThanOrEqual(
          layout.viewportWidth + 1
        );
      }
    } finally {
      await this.page.setViewportSize(originalViewport);
    }
  }

  async expectReviewFilteringAndSortingWork(expectedProductId: string): Promise<void> {
    const badge = this.page.locator('.jdgm-preview-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-id', expectedProductId);

    const reviewWidget = this.page.locator('#judgeme_product_reviews');
    await reviewWidget.scrollIntoViewIfNeeded();
    const reviewList = reviewWidget.locator('.jdgm-review-list');
    const reviewCards = reviewList.locator('.jm-review-item');
    const getVisibleRatings = () =>
      reviewCards.locator('[aria-label*="out of 5 stars"]').evaluateAll((stars) =>
        stars.map((star) => Number(star.getAttribute('aria-label')?.match(/\d+/)?.[0]))
      );

    const filtersButton = reviewWidget.getByRole('button', { name: 'Filters' });
    await filtersButton.click();
    const oneStarFilter = reviewWidget.locator('input[name="rating-filter"][value="1"]');
    await oneStarFilter.check({ force: true });
    await expect(oneStarFilter).toBeChecked();
    await expect.poll(async () => {
      const ratings = await getVisibleRatings();
      return ratings.length > 0 && ratings.every((rating) => rating === 1);
    }, { timeout: 15_000 }).toBe(true);

    await reviewWidget.getByRole('button', { name: 'Clear filters' }).click();
    await expect(oneStarFilter).not.toBeChecked();

    const sort = reviewWidget.getByRole('combobox', { name: 'Sort reviews by' });
    const sortStatus = reviewWidget.getByRole('status');
    await sort.selectOption('highest_rating');
    await expect(sortStatus).toContainText(/Sorted by Highest Rating/i);
    await expect.poll(async () => {
      const ratings = await getVisibleRatings();
      return ratings.length > 0 && ratings[0] === 5 &&
        ratings.every((rating, index) => index === 0 || ratings[index - 1] >= rating);
    }, { timeout: 15_000 }).toBe(true);

    await sort.selectOption('lowest_rating');
    await expect(sortStatus).toContainText(/Sorted by Lowest Rating/i);
    await expect.poll(async () => {
      const ratings = await getVisibleRatings();
      return ratings.length > 0 && ratings[0] === 1 &&
        ratings.every((rating, index) => index === 0 || ratings[index - 1] <= rating);
    }, { timeout: 15_000 }).toBe(true);
  }

  async expectReviewPaginationWorks(expectedProductId: string): Promise<void> {
    const badge = this.page.locator('.jdgm-preview-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-id', expectedProductId);

    const reviewWidget = this.page.locator('#judgeme_product_reviews');
    await reviewWidget.scrollIntoViewIfNeeded();

    const reviewList = reviewWidget.locator('.jdgm-review-list');
    const reviewCards = reviewList.locator('.jm-review-item');
    const pagination = reviewWidget.getByRole('navigation', { name: 'Pagination Navigation' });
    const previousPage = pagination.getByRole('button', { name: 'Go to previous page' });
    const nextPage = pagination.getByRole('button', { name: 'Go to next page' });
    const activePage = pagination.locator('[aria-current="page"]');

    await expect(reviewCards).toHaveCount(5);
    await expect(activePage).toHaveText('1');
    await expect(previousPage).toBeDisabled();
    await expect(nextPage).toBeEnabled();

    const firstPageReviewId = await reviewCards.first().getAttribute('review-uuid');
    expect(firstPageReviewId, 'The first review page should render a review').not.toBeNull();

    await pagination.getByRole('button', { name: 'Go to page 2', exact: true }).click();
    await expect(activePage).toHaveText('2');
    await expect(previousPage).toBeEnabled();
    await expect.poll(() => reviewCards.first().getAttribute('review-uuid')).not.toBe(firstPageReviewId);

    const secondPageReviewId = await reviewCards.first().getAttribute('review-uuid');
    expect(secondPageReviewId, 'The second review page should render a review').not.toBeNull();

    await nextPage.click();
    await expect(activePage).toHaveText('3');
    await expect.poll(() => reviewCards.first().getAttribute('review-uuid')).not.toBe(secondPageReviewId);

    await previousPage.click();
    await expect(activePage).toHaveText('2');
    await expect.poll(() => reviewCards.first().getAttribute('review-uuid')).toBe(secondPageReviewId);
  }

  async expectReviewsAreUsableOnMobile(expectedProductId: string): Promise<void> {
    const originalViewport = this.page.viewportSize();
    expect(originalViewport, 'The mobile review check requires a defined viewport').not.toBeNull();
    if (!originalViewport) {
      return;
    }

    try {
      await this.page.setViewportSize({ width: 390, height: 844 });
      const badge = this.page.locator('.jdgm-preview-badge').first();
      await expect(badge).toHaveAttribute('data-id', expectedProductId);

      const reviewWidget = this.page.locator('#judgeme_product_reviews');
      await reviewWidget.getByRole('heading', { name: 'What Customers Say' }).scrollIntoViewIfNeeded();

      const filtersButton = reviewWidget.getByRole('button', { name: 'Filters' });
      const sort = reviewWidget.getByRole('combobox', { name: 'Sort reviews by' });
      await expect(filtersButton).toBeVisible();
      await expect(sort).toBeVisible();

      const controlLayout = await Promise.all(
        [filtersButton, sort].map(async (control) => {
          const bounds = await control.boundingBox();
          expect(bounds, 'Review controls should have visible tap targets').not.toBeNull();
          return bounds;
        })
      );
      const viewportWidth = this.page.viewportSize()!.width;
      for (const bounds of controlLayout) {
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewportWidth);
        expect(bounds!.height).toBeGreaterThanOrEqual(32);
      }

      const reviewList = reviewWidget.locator('.jdgm-review-list');
      const reviewCards = reviewList.locator('.jm-review-item');
      const visibleRatings = () =>
        reviewCards.locator('[aria-label*="out of 5 stars"]').evaluateAll((stars) =>
          stars.map((star) => Number(star.getAttribute('aria-label')?.match(/\d+/)?.[0]))
        );

      await filtersButton.click();
      const oneStarFilter = reviewWidget.locator('input[name="rating-filter"][value="1"]');
      await oneStarFilter.check({ force: true });
      await expect.poll(async () => {
        const ratings = await visibleRatings();
        return ratings.length > 0 && ratings.every((rating) => rating === 1);
      }, { timeout: 15000 }).toBe(true);
      await reviewWidget.getByRole('button', { name: 'Clear filters' }).click();
      await expect(oneStarFilter).not.toBeChecked();

      const sortStatus = reviewWidget.getByRole('status');
      await sort.selectOption('highest_rating');
      await expect(sortStatus).toContainText(/Sorted by Highest Rating/i);
      await expect(sort).toHaveValue('highest_rating');

      const firstPageReviewId = await reviewCards.first().getAttribute('review-uuid');
      const pagination = reviewWidget.getByRole('navigation', { name: 'Pagination Navigation' });
      const nextPage = pagination.getByRole('button', { name: 'Go to next page' });
      await nextPage.click();
      await expect(pagination.locator('[aria-current="page"]')).toHaveText('2');
      await expect.poll(() => reviewCards.first().getAttribute('review-uuid')).not.toBe(firstPageReviewId);

      const pageWidth = await this.page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth
      }));
      expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport);
    } finally {
      await this.page.setViewportSize(originalViewport);
    }
  }

  async expectSubscriptionFrequencyOptionWorks(): Promise<void> {
    const subscribeOption = this.page.getByRole('radio', {
      name: /Subscribe & Save 10%/
    });
    const oneTimeOption = this.page.getByRole('radio', {
      name: /One-time purchase/
    });
    const subscribeLabel = this.subscriptionLabel;
    const sellingPlanInput = this.page.locator('[data-selling-plan-input]');

    await expect(subscribeOption).toBeVisible();
    await expect(oneTimeOption).toBeVisible();
    await expect(subscribeLabel).toContainText(/Delivered monthly/i);

    const planId = await subscribeOption.getAttribute('data-selling-plan-id');
    expect(planId, 'The monthly subscription option should have a selling-plan ID').toBeTruthy();
    await expect(subscribeOption).toBeChecked();
    await expect(sellingPlanInput).toHaveValue(planId!);

    await this.oneTimeLabel.click();
    await expect(oneTimeOption).toBeChecked();
    await expect(sellingPlanInput).toHaveValue('');

    await subscribeLabel.click();
    await expect(subscribeOption).toBeChecked();
    await expect(sellingPlanInput).toHaveValue(planId!);
    await expect(subscribeLabel).toContainText(/Delivered monthly/i);
  }

  async expectQuantityDiscountLogicIsCorrect(): Promise<void> {
    const productForm = this.page
      .locator('form[data-type="add-to-cart-form"]')
      .filter({ has: this.page.locator('.product-subscription-buy-box__options') })
      .first();
    const quantityInput = productForm.locator('input[name="quantity"]');
    const increaseQuantity = productForm.getByRole('button', { name: /Increase quantity/ });
    const decreaseQuantity = productForm.getByRole('button', { name: /Decrease quantity/ });
    const subscribeOption = productForm.locator('input[name="purchase_option"][value="subscribe"]');
    const oneTimeOption = productForm.locator('input[name="purchase_option"][value="onetime"]');
    const subscribePriceText = await subscribeOption
      .locator('xpath=ancestor::label[1]')
      .locator('.product-subscription-buy-box__current-price')
      .innerText();
    const oneTimePriceText = await oneTimeOption
      .locator('xpath=ancestor::label[1]')
      .locator('.product-subscription-buy-box__current-price')
      .innerText();
    const parsePrice = (price: string): number => {
      const amount = Number(price.replace(/[$,]/g, ''));
      expect(Number.isFinite(amount), `Price "${price}" should be numeric`).toBe(true);
      return amount;
    };
    const subscriptionUnitPrice = parsePrice(subscribePriceText);
    const oneTimeUnitPrice = parsePrice(oneTimePriceText);
    const expectedSubscriptionPrice =
      Math.round(oneTimeUnitPrice * 0.9 * 100) / 100;
    expect(subscriptionUnitPrice).toBe(expectedSubscriptionPrice);

    const assertQuantityPrice = async (unitPrice: number, quantity: number) => {
      const expectedTotal = (unitPrice * quantity).toFixed(2);
      await expect(quantityInput).toHaveValue(String(quantity));
      await expect(productForm.locator('[data-price-text]')).toHaveText(
        new RegExp(`\\$${expectedTotal.replace('.', '\\.')}`)
      );
    };

    for (const purchaseOption of [
      { control: subscribeOption, unitPrice: subscriptionUnitPrice },
      { control: oneTimeOption, unitPrice: oneTimeUnitPrice }
    ]) {
      await purchaseOption.control.check({ force: true });
      await expect(purchaseOption.control).toBeChecked();
      let quantity = Number(await quantityInput.inputValue());
      while (quantity > 1) {
        await decreaseQuantity.click();
        quantity -= 1;
        await expect(quantityInput).toHaveValue(String(quantity));
      }
      await assertQuantityPrice(purchaseOption.unitPrice, 1);

      for (const quantity of [2, 3]) {
        await increaseQuantity.click();
        await assertQuantityPrice(purchaseOption.unitPrice, quantity);
      }
    }
  }

  async expectQuantityPricingAtHigherQuantities(): Promise<void> {
    const productForm = this.page
      .locator('form[data-type="add-to-cart-form"]')
      .filter({ has: this.page.locator('.product-subscription-buy-box__options') })
      .first();
    const quantityInput = productForm.locator('input[name="quantity"]');
    const increaseQuantity = productForm.getByRole('button', { name: /Increase quantity/ });
    const decreaseQuantity = productForm.getByRole('button', { name: /Decrease quantity/ });
    const purchaseOptions = [
      {
        option: productForm.locator('input[name="purchase_option"][value="subscribe"]'),
        unitPriceLocator: productForm
          .locator('input[name="purchase_option"][value="subscribe"]')
          .locator('xpath=ancestor::label[1]')
          .locator('.product-subscription-buy-box__current-price')
      },
      {
        option: productForm.locator('input[name="purchase_option"][value="onetime"]'),
        unitPriceLocator: productForm
          .locator('input[name="purchase_option"][value="onetime"]')
          .locator('xpath=ancestor::label[1]')
          .locator('.product-subscription-buy-box__current-price')
      }
    ];
    const parsePrice = (price: string): number => {
      const amount = Number(price.replace(/[$,]/g, ''));
      expect(Number.isFinite(amount), `Price "${price}" should be numeric`).toBe(true);
      return amount;
    };

    for (const { option, unitPriceLocator } of purchaseOptions) {
      await option.check({ force: true });
      await expect(option).toBeChecked();
      let currentQuantity = Number(await quantityInput.inputValue());

      while (currentQuantity > 1) {
        await decreaseQuantity.click();
        currentQuantity -= 1;
        await expect(quantityInput).toHaveValue(String(currentQuantity));
      }

      const unitPrice = parsePrice(await unitPriceLocator.innerText());
      for (const targetQuantity of [1, 2, 3, 6, 12]) {
        while (currentQuantity < targetQuantity) {
          await increaseQuantity.click();
          currentQuantity += 1;
          await expect(quantityInput).toHaveValue(String(currentQuantity));
        }

        const expectedTotal = (unitPrice * targetQuantity).toFixed(2);
        await expect(productForm.locator('[data-price-text]')).toHaveText(
          new RegExp(`\\$${expectedTotal.replace('.', '\\.')}`)
        );
        await expect(unitPriceLocator).toHaveText(
          new RegExp(`\\$${unitPrice.toFixed(2).replace('.', '\\.')}`)
        );
      }
    }
  }

  async expectMultiplePromotionsDoNotConflict(): Promise<void> {
    const productForm = this.page
      .locator('form[data-type="add-to-cart-form"]')
      .filter({ has: this.page.locator('.product-subscription-buy-box__options') })
      .first();
    const quantityInput = productForm.locator('input[name="quantity"]');
    const increaseQuantity = productForm.getByRole('button', { name: /Increase quantity/ });
    const subscribeOption = productForm.locator('input[name="purchase_option"][value="subscribe"]');
    const oneTimeOption = productForm.locator('input[name="purchase_option"][value="onetime"]');
    const subscriptionLabel = subscribeOption.locator('xpath=ancestor::label[1]');
    const oneTimeLabel = oneTimeOption.locator('xpath=ancestor::label[1]');
    const subscriptionUnitPrice = Number(
      (await subscriptionLabel.locator('.product-subscription-buy-box__current-price').innerText())
        .replace(/[$,]/g, '')
    );
    const oneTimeUnitPrice = Number(
      (await oneTimeLabel.locator('.product-subscription-buy-box__current-price').innerText())
        .replace(/[$,]/g, '')
    );
    expect(Number.isFinite(subscriptionUnitPrice)).toBe(true);
    expect(Number.isFinite(oneTimeUnitPrice)).toBe(true);
    expect(subscriptionUnitPrice).toBe(
      Math.round(oneTimeUnitPrice * 0.9 * 100) / 100
    );

    await subscriptionLabel.click();
    await expect(subscribeOption).toBeChecked();
    await expect(quantityInput).toHaveValue('1');
    await increaseQuantity.click();
    await expect(quantityInput).toHaveValue('2');
    await expect(productForm.locator('[data-price-text]')).toHaveText(
      `$${(subscriptionUnitPrice * 2).toFixed(2)}`
    );

    await oneTimeLabel.click();
    await expect(oneTimeOption).toBeChecked();
    await expect(productForm.locator('[data-price-text]')).toHaveText(
      `$${(oneTimeUnitPrice * 2).toFixed(2)}`
    );

    const upsellSection = this.page.locator('.section-try-other');
    const bundleCard = upsellSection
      .locator('.section-try-other__item')
      .filter({ hasText: 'Get both flavors' });
    const bundleDisplayedPrice = await bundleCard.locator('.section-try-other__price').innerText();
    const bundlePrice = Number(bundleDisplayedPrice.replace(/[$,]/g, ''));
    expect(Number.isFinite(bundlePrice)).toBe(true);
    expect(bundlePrice).toBe(Math.round(subscriptionUnitPrice * 2 * 100) / 100);

    const bundleButton = bundleCard.getByRole('button', { name: 'Add both', exact: true });
    const bundleItemsText = await bundleButton.getAttribute('data-items');
    expect(bundleItemsText, 'Bundle promotion should provide its item data').not.toBeNull();
    const bundleItems: unknown = JSON.parse(bundleItemsText!);
    expect(Array.isArray(bundleItems)).toBe(true);
    expect(bundleItems).toHaveLength(2);
    expect(
      (bundleItems as Array<Record<string, unknown>>).every(
        (item) => item.quantity === 1 && typeof item.selling_plan === 'number'
      ),
      'The bundle should apply the subscription plan once per item without another quantity tier'
    ).toBe(true);
  }

  async expectEstimatedDeliveryDateMatchesShippingPolicy(): Promise<boolean> {
    const deliveryEstimateLines = (await this.page.locator('body').innerText())
      .split(/\n/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => /estimated delivery|delivery estimate|expected delivery|arrives by/i.test(line));

    const shippingPolicyPage = await this.page.context().newPage();
    try {
      const response = await shippingPolicyPage.goto(
        new URL('/policies/shipping-policy', this.page.url()).toString(),
        { waitUntil: 'domcontentloaded' }
      );
      expect(response, 'The published shipping policy should return a response').not.toBeNull();
      expect(response!.status()).toBeLessThan(400);

      const shippingTable = shippingPolicyPage.getByRole('table');
      await expect(shippingTable).toContainText(/Standard\s+3[–-]4 business days/i);
      await expect(shippingTable).toContainText(/Express\s+1[–-]2 business days/i);
      await expect(shippingPolicyPage.locator('main')).toContainText(
        /before\s+12pm CST.*same day.*following business day/i
      );
    } finally {
      await shippingPolicyPage.close();
    }

    if (deliveryEstimateLines.length === 0) {
      return false;
    }

    const estimateText = deliveryEstimateLines.join(' ');
    const methodAndWindow = [
      { method: /standard/i, days: /3[–-]4 business days/i },
      { method: /express/i, days: /1[–-]2 business days/i }
    ].find(({ method }) => method.test(estimateText));
    expect(
      methodAndWindow,
      'A delivery estimate must identify a shipping method to compare against its published window'
    ).toBeDefined();
    expect(estimateText).toMatch(methodAndWindow!.days);
    return true;
  }

  async expectPostalCodeCheckerResponds(): Promise<boolean> {
    const inputs = this.page.locator('input');
    const postalInputIndex = await inputs.evaluateAll((elements) =>
      elements.findIndex((element) => {
        const input = element as HTMLInputElement;
        const attributes = [
          input.name,
          input.id,
          input.placeholder,
          input.getAttribute('aria-label'),
          input.autocomplete
        ];
        const style = window.getComputedStyle(input);
        const bounds = input.getBoundingClientRect();
        const isVisible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          bounds.width > 0 &&
          bounds.height > 0;
        return isVisible && /postal|post code|postcode|zip code|zipcode|\bzip\b/i.test(attributes.join(' '));
      })
    );

    if (postalInputIndex < 0) {
      return false;
    }

    const postalInput = inputs.nth(postalInputIndex);
    const form = postalInput.locator('xpath=ancestor::form[1]');
    await expect(form).toHaveCount(1);
    const submitButton = form.getByRole('button');
    await expect(submitButton.first()).toBeVisible();

    const responseRegion = form.locator('xpath=..');
    const initialText = (await responseRegion.innerText()).replace(/\s+/g, ' ').trim();
    await postalInput.fill('10001');
    await submitButton.first().click();
    await expect.poll(async () =>
      (await responseRegion.innerText()).replace(/\s+/g, ' ').trim()
    ).not.toBe(initialText);

    return true;
  }

  async expectCheckoutPostalCodeCheckerResponds(productName: string): Promise<void> {
    await expect(this.productTitle).toHaveText(new RegExp(productName, 'i'));
    await this.addToCartButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    await cartDrawer.getByRole('button', { name: /checkout/i }).click();
    await expect(this.page).toHaveURL(/\/checkouts\//i, { timeout: 30000 });

    const addressInput = this.page.locator('input[name="address1"]:visible').first();
    const cityInput = this.page.locator('input[name="city"]:visible').first();
    const stateSelect = this.page.locator('select[name="zone"]:visible').first();
    const postalInput = this.page.locator('input[name="postalCode"]:visible').first();

    await expect(addressInput).toBeVisible({ timeout: 30000 });
    await addressInput.fill('123 Main Street');
    await cityInput.fill('New York');
    await stateSelect.selectOption({ label: 'New York' });
    await postalInput.fill('10001');

    const standardShipping = this.page.getByRole('radio', { name: 'Standard' }).first();
    const expressShipping = this.page.getByRole('radio', { name: 'Express' }).first();
    await expect(standardShipping).toBeVisible({ timeout: 30000 });
    await expect(expressShipping).toBeVisible();

    const postalField = postalInput.locator('xpath=../..');
    await postalInput.fill('ABCDE');
    await postalInput.press('Tab');
    await expect(postalInput).toHaveAttribute('aria-invalid', 'true', { timeout: 15000 });
    await expect(postalField).toContainText(/Enter a valid ZIP(?: \/ postal)? code/);

    await postalInput.fill('10001');
    await postalInput.press('Tab');
    await expect(postalInput).not.toHaveAttribute('aria-invalid', 'true', { timeout: 15000 });
    await expect(postalField).not.toContainText(/Enter a valid ZIP(?: \/ postal)? code/);
    await expect(standardShipping).toBeVisible();
    await expect(expressShipping).toBeVisible();
  }

  async expectUsMarketCheckoutPricingMatchesProduct(productName: string): Promise<void> {
    const expectedPrice = (await this.productPrice.innerText()).trim();
    await this.addToCartButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    const cartItem = cartDrawer.locator('.cart-item').filter({ hasText: productName }).first();
    const cartPrice = (
      await cartItem.locator('.cart-item__totals .price--end').innerText()
    ).trim();
    expect(cartPrice).toBe(expectedPrice);

    await cartDrawer.getByRole('button', { name: /checkout/i }).click();
    await expect(this.page).toHaveURL(/\/checkouts\//i, { timeout: 30000 });

    const country = this.page.getByRole('combobox', { name: 'Country/Region' });
    await expect(country).toHaveValue('US');
    await expect(this.page.getByText('USD', { exact: true })).toBeVisible();

    const checkoutRow = this.page.getByRole('row').filter({ hasText: productName }).first();
    await expect(checkoutRow).toBeVisible({ timeout: 30000 });
    await expect(checkoutRow).toContainText(expectedPrice);
  }

  async expectVariantChangePreservesSubscriptionSelection(
    expectedVariant: string
  ): Promise<void> {
    const subscribeLabel = this.subscriptionLabel;
    const subscribeOption = this.page.getByRole('radio', {
      name: /Subscribe & Save 10%/
    });
    const sellingPlanInput = this.page.locator('[data-selling-plan-input]');

    await subscribeLabel.click();
    await expect(subscribeOption).toBeChecked();
    const initialPlanId = await subscribeOption.getAttribute('data-selling-plan-id');
    expect(initialPlanId, 'The selected subscription should have a selling-plan ID').toBeTruthy();
    await expect(sellingPlanInput).toHaveValue(initialPlanId!);

    const variant = this.productFlavorOptions.filter({ hasText: expectedVariant }).first();
    await expect(variant).toBeVisible();
    await variant.click();

    const expectedSlug = expectedVariant.toLowerCase().replace(/\s+/g, '-');
    await expect(this.page).toHaveURL(new RegExp(`/products/${expectedSlug}(?:[?#]|$)`));
    await expect(this.productTitle).toHaveText(new RegExp(expectedVariant, 'i'));

    const updatedSubscribeOption = this.page.getByRole('radio', {
      name: /Subscribe & Save 10%/
    });
    await expect(updatedSubscribeOption).toBeChecked();
    const updatedPlanId = await updatedSubscribeOption.getAttribute('data-selling-plan-id');
    expect(updatedPlanId, 'The selected variant should have a selling-plan ID').toBeTruthy();
    await expect(this.page.locator('[data-selling-plan-input]')).toHaveValue(updatedPlanId!);
  }

  async expectFrequentlyBoughtTogetherAddsBothVariants(
    firstProductName: string,
    secondProductName: string
  ): Promise<void> {
    const bundleSection = this.page.locator('.section-try-other');
    await expect(bundleSection).toBeVisible();
    await expect(bundleSection.getByRole('heading', { name: 'Get both flavors' })).toBeVisible();
    await expect(bundleSection).toContainText(/24 bars, two packs/i);

    const addBothButton = bundleSection.getByRole('button', { name: 'Add both', exact: true });
    await expect(addBothButton).toBeEnabled();
    await addBothButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(/Your Cart \(2\)/i)).toBeVisible({ timeout: 15000 });
    const cartItems = cartDrawer.locator('.cart-item');
    await expect(cartItems).toHaveCount(2);

    for (const productName of [firstProductName, secondProductName]) {
      const cartItem = cartItems.filter({ hasText: productName });
      await expect(cartItem).toHaveCount(1);
      await expect(cartItem.getByText(/1 month subscription with 10% discount/i)).toBeVisible();
      await expect(cartItem.locator('a.cart-item__name')).toHaveAttribute(
        'href',
        /[?&]selling_plan=\d+/
      );
      await expect(cartItem.getByRole('spinbutton')).toHaveValue('1');
    }

    await expect(cartDrawer.getByText('$71.98').first()).toBeVisible();
  }

  async expectUpsellProductsAreCorrect(
    currentProductName: string,
    recommendedProductName: string,
    currentVariantId: string,
    recommendedVariantId: string
  ): Promise<void> {
    const upsellSection = this.page.locator('.section-try-other');
    await expect(upsellSection).toBeVisible();

    const recommendations = upsellSection.locator('.section-try-other__item');
    await expect(recommendations).toHaveCount(2);

    const otherFlavorCard = recommendations.filter({ hasText: 'Try the other flavor' });
    await expect(otherFlavorCard).toHaveCount(1);
    await expect(otherFlavorCard.getByRole('heading', { name: recommendedProductName, exact: true }))
      .toBeVisible();
    await expect(otherFlavorCard.locator('img')).toHaveAttribute('alt', recommendedProductName);

    const expectedPath = `/products/${recommendedProductName.toLowerCase().replace(/\s+/g, '-')}`;
    await expect(otherFlavorCard.getByRole('link', { name: 'View flavor' })).toHaveAttribute(
      'href',
      expectedPath
    );

    const bundleCard = recommendations.filter({ hasText: 'Get both flavors' });
    const addBothButton = bundleCard.getByRole('button', { name: 'Add both', exact: true });
    const bundleItemsAttribute = await addBothButton.getAttribute('data-items');
    expect(bundleItemsAttribute, 'The bundle should define its product variants').not.toBeNull();

    let parsedItems: unknown;
    try {
      parsedItems = JSON.parse(bundleItemsAttribute!);
    } catch {
      throw new Error('The bundle product variants should be valid JSON');
    }

    expect(Array.isArray(parsedItems), 'Bundle variants should be an array').toBe(true);
    const bundleItems = parsedItems as Array<Record<string, unknown>>;
    expect(bundleItems).toHaveLength(2);
    expect(bundleItems.every((item) => typeof item.id === 'number')).toBe(true);
    expect(bundleItems.map((item) => String(item.id)).sort()).toEqual(
      [currentVariantId, recommendedVariantId].sort()
    );
    expect(
      bundleItems.every(
        (item) => item.quantity === 1 && typeof item.selling_plan === 'number'
      ),
      'The bundle should include one subscription unit of each flavor'
    ).toBe(true);
  }

  async expectSoldOutUpsellItemsAreNotPurchasable(
    currentProductName: string,
    recommendedProductName: string,
    currentVariantId: string,
    recommendedVariantId: string
  ): Promise<boolean> {
    const products = [
      { name: currentProductName, variantId: currentVariantId },
      { name: recommendedProductName, variantId: recommendedVariantId }
    ];
    const unavailableVariantIds: string[] = [];
    const baseUrl = new URL(this.page.url());

    for (const product of products) {
      const slug = product.name.toLowerCase().replace(/\s+/g, '-');
      const response = await this.page.request.get(
        new URL(`/products/${slug}.js`, baseUrl).toString()
      );
      expect(response.ok(), `Availability for ${product.name} should load`).toBe(true);
      const productData: unknown = await response.json();
      expect(
        typeof productData === 'object' && productData !== null && 'variants' in productData,
        `${product.name} should provide variant availability`
      ).toBe(true);

      const variants = (productData as { variants: unknown[] }).variants;
      expect(Array.isArray(variants), `${product.name} should provide its variants`).toBe(true);
      const variant = variants.find(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          String(item.id) === product.variantId
      );
      expect(variant, `${product.name} should include the expected variant`).toBeDefined();
      expect(
        typeof variant === 'object' && variant !== null && 'available' in variant,
        `${product.name} should provide variant availability`
      ).toBe(true);
      expect(
        typeof (variant as { available: unknown }).available,
        `${product.name} availability should be boolean`
      ).toBe('boolean');

      if (!(variant as { available: boolean }).available) {
        unavailableVariantIds.push(product.variantId);
      }
    }

    if (unavailableVariantIds.length === 0) {
      return false;
    }

    const bundleCard = this.page
      .locator('.section-try-other__item')
      .filter({ hasText: 'Get both flavors' });
    const addBothButton = bundleCard.getByRole('button', { name: 'Add both', exact: true });
    if (await addBothButton.isEnabled()) {
      const bundleItemsAttribute = await addBothButton.getAttribute('data-items');
      expect(bundleItemsAttribute, 'The bundle should define its purchasable items').not.toBeNull();
      const bundleItems: unknown = JSON.parse(bundleItemsAttribute!);
      expect(Array.isArray(bundleItems), 'Bundle items should be an array').toBe(true);
      const includedVariantIds = (bundleItems as Array<{ id: number }>).map((item) =>
        String(item.id)
      );
      for (const unavailableVariantId of unavailableVariantIds) {
        expect(
          includedVariantIds,
          `Sold-out variant ${unavailableVariantId} must not be included in the bundle CTA`
        ).not.toContain(unavailableVariantId);
      }
    }

    return true;
  }

  async expectReviewStarsNavigateToReviews(expectedProductId: string): Promise<void> {
    const badge = this.page.locator('.jdgm-preview-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-id', expectedProductId);

    const seeAllReviews = badge.getByRole('button', { name: 'See all reviews' });
    const reviewHeading = this.page
      .locator('#judgeme_product_reviews')
      .getByRole('heading', { name: 'What Customers Say' });
    await expect(seeAllReviews).toBeVisible();
    await expect(reviewHeading).toBeAttached();

    await seeAllReviews.click();

    await expect(reviewHeading).toBeInViewport();
  }

  async expectProductAccordionsOpenAndClose(): Promise<void> {
    const accordions = this.page.locator('.product__info-container details');
    const count = await accordions.count();
    expect(count, 'The product page should have accordions to test').toBeGreaterThan(0);

    for (let index = 0; index < count; index++) {
      const accordion = accordions.nth(index);
      const summary = accordion.locator('summary');
      const content = accordion.locator('.accordion__content');
      const title = (await summary.innerText()).replace(/\s+/g, ' ').trim();
      const contentText = (await content.textContent())?.replace(/\s+/g, ' ').trim() ?? '';

      expect(title, 'Each accordion should have a visible title').not.toBe('');
      expect(contentText, `The "${title}" accordion should contain content`).not.toBe('');
      await expect(summary).toHaveAttribute('aria-expanded', /^(true|false)$/);

      const initiallyOpen = await accordion.evaluate(
        (element) => (element as HTMLDetailsElement).open
      );
      await expect(summary).toHaveAttribute('aria-expanded', String(initiallyOpen));

      await summary.click();
      await expect(accordion).toHaveJSProperty('open', !initiallyOpen);
      await expect(summary).toHaveAttribute('aria-expanded', String(!initiallyOpen));
      if (initiallyOpen) {
        await expect(content).toBeHidden();
      } else {
        await expect(content).toBeVisible();
        await expect(content).toContainText(contentText);
      }

      await summary.click();
      await expect(accordion).toHaveJSProperty('open', initiallyOpen);
      await expect(summary).toHaveAttribute('aria-expanded', String(initiallyOpen));
      if (initiallyOpen) {
        await expect(content).toBeVisible();
        await expect(content).toContainText(contentText);
      } else {
        await expect(content).toBeHidden();
      }
    }
  }

  async expectProductAccordionsAreUsableOnMobile(): Promise<void> {
    const originalViewport = this.page.viewportSize();
    expect(originalViewport, 'The mobile accordion check requires a defined viewport').not.toBeNull();
    if (!originalViewport) {
      return;
    }

    try {
      await this.page.setViewportSize({ width: 390, height: 844 });
      const accordions = this.page.locator('.product__info-container details');
      const count = await accordions.count();
      expect(count, 'The product page should have accordions to test').toBeGreaterThan(0);

      for (let index = 0; index < count; index++) {
        const accordion = accordions.nth(index);
        const summary = accordion.locator('summary');
        const content = accordion.locator('.accordion__content');
        const label = (await summary.innerText()).replace(/\s+/g, ' ').trim();

        await expect(summary, `The "${label}" accordion control should be visible`).toBeVisible();
        const controlBounds = await summary.boundingBox();
        expect(controlBounds, `The "${label}" control should have a tap target`).not.toBeNull();
        expect(controlBounds!.height, `The "${label}" tap target should be at least 44px tall`).toBeGreaterThanOrEqual(
          44
        );
        expect(controlBounds!.x).toBeGreaterThanOrEqual(0);
        expect(controlBounds!.x + controlBounds!.width).toBeLessThanOrEqual(390);

        const initiallyOpen = await accordion.evaluate(
          (element) => element instanceof HTMLDetailsElement && element.open
        );
        await summary.click();
        await expect(accordion).toHaveJSProperty('open', !initiallyOpen);
        if (initiallyOpen) {
          await expect(content).toBeHidden();
        } else {
          await expect(content).toBeVisible();
          await expect(content).not.toBeEmpty();
          const contentBounds = await content.boundingBox();
          expect(contentBounds, `The "${label}" content should fit the mobile viewport`).not.toBeNull();
          expect(contentBounds!.x).toBeGreaterThanOrEqual(-1);
          expect(contentBounds!.x + contentBounds!.width).toBeLessThanOrEqual(391);
        }

        const pageWidth = await this.page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth
        }));
        expect(
          pageWidth.content,
          `Opening "${label}" should not create horizontal page overflow`
        ).toBeLessThanOrEqual(pageWidth.viewport);

        await summary.click();
        await expect(accordion).toHaveJSProperty('open', initiallyOpen);
      }
    } finally {
      await this.page.setViewportSize(originalViewport);
    }
  }

  async expectPopupsDoNotBlockPdpActions(productName: string): Promise<void> {
    await this.page.setViewportSize({ width: 390, height: 844 });
    await this.page.waitForTimeout(5000);

    const popupDialogs = this.page.locator(
      '[role="dialog"]:visible, [aria-modal="true"]:visible, dialog[open]:visible'
    );
    for (let index = 0; index < (await popupDialogs.count()); index++) {
      const popup = popupDialogs.nth(index);
      const popupClass = await popup.getAttribute('class') ?? '';
      if (/product-media-modal|jdgm-(?:review-widget|write-review)/i.test(popupClass)) {
        continue;
      }

      const closeButton = popup.locator(
        'button[aria-label*="close" i], button[title*="close" i]'
      ).first();
      const dismissButton = popup.getByRole('button', {
        name: /close|dismiss|no thanks|not now/i
      }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else if (await dismissButton.isVisible()) {
        await dismissButton.click();
      } else {
        await this.page.keyboard.press('Escape');
      }
      await expect(popup, 'A promotional popup should be dismissible').toBeHidden({
        timeout: 5000
      });
    }

    const oneTimeOption = this.page.getByRole('radio', { name: /One-time purchase/i });
    await expect(oneTimeOption).toBeVisible();
    await this.oneTimeLabel.click();
    await expect(oneTimeOption).toBeChecked();

    const quantity = this.page.locator('input.quantity__input:visible').first();
    await expect(quantity).toHaveValue('1');
    await this.page.getByRole('button', {
      name: `Increase quantity for ${productName}`
    }).click();
    await expect(quantity).toHaveValue('2');

    await expect(this.addToCartButton).toBeVisible();
    await this.addToCartButton.click();
    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    await expect(cartDrawer.locator('input.quantity__input:visible').first()).toHaveValue('2');
  }

  async expectShippingAccordionsAreCorrect(): Promise<void> {
    const shippingTab = this.page.getByRole('tab', { name: 'Shipping', exact: true });
    await expect(shippingTab).toBeVisible();
    await shippingTab.click();
    await expect(shippingTab).toHaveClass(/is-active/);

    const shippingPanel = this.page.locator(
      '.section-faq__panel[data-tab-panel="shipping"]'
    );
    await expect(shippingPanel).toHaveClass(/is-active/);
    await expect(shippingPanel).toBeVisible();

    const expectedAnswers = [
      {
        question: 'How long does TiLT shipping take?',
        answer: /process orders quickly.*delivery times may vary by location.*shipping method/i
      },
      {
        question: 'How much does TiLT shipping cost?',
        answer: /calculated at checkout.*delivery location.*shipping method.*free shipping offers/i
      },
      {
        question: 'Can I track my TiLT order?',
        answer: /tracking link by email/i
      },
      {
        question: 'What should I do if my TiLT order arrives damaged?',
        answer: /arrives damaged.*contact our support team.*help resolve it/i
      },
      {
        question: 'Can I change my shipping address after placing a TiLT order?',
        answer: /if your order has not been processed.*update your shipping address.*contact our support team/i
      }
    ];

    for (const expected of expectedAnswers) {
      const accordion = shippingPanel
        .locator('.section-faq__item')
        .filter({ hasText: expected.question });
      await expect(accordion, `Shipping FAQ should include "${expected.question}"`).toHaveCount(
        1
      );

      const summary = accordion.locator('summary');
      await summary.click();
      await expect(accordion).toHaveJSProperty('open', true);

      const answer = accordion.locator('.section-faq__answer');
      await expect(answer).toBeVisible();
      await expect(answer).toContainText(expected.answer);
    }
  }

  async expectReturnsAccordionIsCorrect(): Promise<boolean> {
    const accordions = this.page.locator(
      '.section-faq__item, .product__info-container details'
    );
    const matching: Locator[] = [];

    for (let index = 0; index < (await accordions.count()); index++) {
      const accordion = accordions.nth(index);
      const question = (await accordion.locator('summary').textContent()) ?? '';
      if (/\breturn(?:s)?\b|\brefund(?:s)?\b|\bsatisfaction guarantee\b/i.test(question)) {
        matching.push(accordion);
      }
    }

    if (matching.length === 0) {
      return false;
    }

    for (const accordion of matching) {
      const tabPanel = accordion.locator('xpath=ancestor::*[@data-tab-panel][1]');
      if ((await tabPanel.count()) > 0) {
        const panelName = await tabPanel.getAttribute('data-tab-panel');
        if (panelName) {
          const tab = this.page.locator(
            `.section-faq__tab[data-tab-target="${panelName}"]`
          );
          if ((await tab.count()) > 0) {
            await tab.click();
            await expect(tabPanel).toBeVisible();
          }
        }
      }

      const summary = accordion.locator('summary');
      await summary.click();
      await expect(accordion).toHaveJSProperty('open', true);
      await expect(summary).toHaveAttribute('aria-expanded', 'true');

      const answer = accordion.locator('.section-faq__answer, .accordion__content');
      await expect(answer).toBeVisible();
      await expect(answer).toContainText(/90 days|refund|return/i);
    }

    return true;
  }

  async expectProductSpecificSpecifications(productName: string): Promise<void> {
    await expect(this.productTitle).toContainText(productName);
    const productInfo = this.page.locator('.product__info-container').first();
    await expect(productInfo).toContainText(/12 bars\s*·\s*28g protein each/i);
    await expect(productInfo).toContainText(/pack of 12/i);

    const nutritionSection = this.page
      .locator('.product__info-container details summary')
      .filter({ hasText: 'Nutrition' })
      .locator('xpath=..');
    await expect(nutritionSection).toHaveCount(1);

    const nutritionSummary = nutritionSection.locator('summary');
    const isOpen = await nutritionSection.evaluate(
      (element) => (element as HTMLDetailsElement).open
    );
    if (!isOpen) {
      await nutritionSummary.click();
    }

    const nutritionContent = nutritionSection.locator('.accordion__content');
    await expect(nutritionContent).toBeVisible();
    await expect(nutritionContent).toContainText(/240 calories/i);
    await expect(nutritionContent).toContainText(/28g protein/i);
    await expect(nutritionContent).toContainText(/6g fiber/i);
    await expect(nutritionContent).toContainText(/5g net carbs per bar \(62g\)/i);

    const descriptionSection = this.page
      .locator('.product__info-container details summary')
      .filter({ hasText: 'Description' })
      .locator('xpath=..');
    await expect(descriptionSection).toContainText(
      productName === 'Chocolate Sea Salt'
        ? 'Rich chocolate. Crisp sea salt.'
        : 'Smooth vanilla. Crunchy almonds.'
    );
  }

  private async openMetafieldSections(): Promise<number> {
    const metafieldBlocks = this.page.locator(
      '.product__info-container .metafield-rich_text_field'
    );
    const count = await metafieldBlocks.count();

    for (let index = 0; index < count; index++) {
      const block = metafieldBlocks.nth(index);
      const section = block.locator('xpath=ancestor::details[1]');
      if ((await section.count()) > 0) {
        const isOpen = await section.evaluate((element) => (element as HTMLDetailsElement).open);
        if (!isOpen) {
          await section.locator('summary').click();
        }
      }
    }

    return count;
  }

  async expectProductMetafieldsDisplayCorrectly(): Promise<boolean> {
    const count = await this.openMetafieldSections();
    if (count === 0) {
      return false;
    }

    const metafieldBlocks = this.page.locator(
      '.product__info-container .metafield-rich_text_field'
    );
    for (let index = 0; index < count; index++) {
      const block = metafieldBlocks.nth(index);
      await expect(block).toBeVisible();
      await expect(block).not.toBeEmpty();
      await expect(block.locator('p, li, a, img').first()).toBeVisible();
    }

    return true;
  }

  async expectEmptyMetafieldsDoNotCreateSections(): Promise<void> {
    const details = this.page.locator(
      '.product__info-container details[id^="Details-collapsible_tab"]'
    );
    const count = await details.count();

    for (let index = 0; index < count; index++) {
      const section = details.nth(index);
      const summary = section.locator('summary');
      const content = section.locator('.accordion__content');
      const metafield = section.locator('.metafield-rich_text_field');
      if ((await metafield.count()) === 0) {
        continue;
      }

      const summaryText = (await summary.textContent())?.replace(/\s+/g, ' ').trim() ?? '';
      const contentText = (await metafield.textContent())?.replace(/\s+/g, ' ').trim() ?? '';

      if (contentText === '') {
        await expect(
          summary,
          'An empty metafield should not create a visible accordion section'
        ).toBeHidden();
        continue;
      }

      expect(summaryText, 'A rendered metafield section should have a title').not.toBe('');
      await expect(summary).toBeVisible();
    }
  }

  async expectLongMetafieldContentDoesNotBreakLayout(): Promise<boolean> {
    const metafieldBlocks = this.page.locator(
      '.product__info-container .metafield-rich_text_field'
    );
    let targetIndex = -1;

    for (let index = 0; index < (await metafieldBlocks.count()); index++) {
      const text = ((await metafieldBlocks.nth(index).textContent()) ?? '').trim();
      if (text.length >= 250) {
        targetIndex = index;
        break;
      }
    }

    if (targetIndex < 0) {
      return false;
    }

    const target = metafieldBlocks.nth(targetIndex);
    const section = target.locator('xpath=ancestor::details[1]');
    if ((await section.count()) > 0) {
      const isOpen = await section.evaluate((element) => (element as HTMLDetailsElement).open);
      if (!isOpen) {
        await section.locator('summary').click();
      }
    }

    const originalViewport = this.page.viewportSize();
    expect(originalViewport, 'The layout check requires a defined viewport').not.toBeNull();
    if (!originalViewport) {
      return false;
    }

    for (const width of [...new Set([originalViewport.width, 390])]) {
      await this.page.setViewportSize({ width, height: originalViewport.height });
      await expect(target).toBeVisible();

      const layout = await target.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const productInfo = element.closest('.product__info-container');
        const parentBounds = productInfo?.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          width: bounds.width,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          parentLeft: parentBounds?.left ?? 0,
          parentRight: parentBounds?.right ?? document.documentElement.clientWidth
        };
      });

      expect(layout.width).toBeGreaterThan(0);
      expect(layout.left).toBeGreaterThanOrEqual(layout.parentLeft - 1);
      expect(layout.right).toBeLessThanOrEqual(layout.parentRight + 1);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    }

    await this.page.setViewportSize(originalViewport);
    return true;
  }

  async expectRichTextMetafieldsRenderCorrectly(): Promise<boolean> {
    const count = await this.openMetafieldSections();
    if (count === 0) {
      return false;
    }

    const metafieldBlocks = this.page.locator(
      '.product__info-container .metafield-rich_text_field'
    );
    let renderedRichTextCount = 0;

    for (let index = 0; index < count; index++) {
      const block = metafieldBlocks.nth(index);
      const text = (await block.innerText()).trim();
      if (text.length === 0) {
        continue;
      }

      await expect(block).toBeVisible();
      const semanticElements = block.locator('p, ul, ol, li, strong, em, a');
      expect(
        await semanticElements.count(),
        'Rich-text metafields should render as semantic HTML, not flattened text'
      ).toBeGreaterThan(0);
      renderedRichTextCount++;
    }

    return renderedRichTextCount > 0;
  }

  async expectMetafieldReferencesLoadCorrectly(): Promise<boolean> {
    const referenceBlocks = this.page.locator(
      '.product__info-container [class*="metafield"]'
    );
    const count = await referenceBlocks.count();
    const references: { block: Locator; kind: 'image' | 'link' }[] = [];

    for (let index = 0; index < count; index++) {
      const block = referenceBlocks.nth(index);
      const images = block.locator('img');
      const links = block.locator('a[href]');

      for (let imageIndex = 0; imageIndex < (await images.count()); imageIndex++) {
        references.push({ block: images.nth(imageIndex), kind: 'image' });
      }
      for (let linkIndex = 0; linkIndex < (await links.count()); linkIndex++) {
        references.push({ block: links.nth(linkIndex), kind: 'link' });
      }
    }

    if (references.length === 0) {
      return false;
    }

    for (const reference of references) {
      await expect(reference.block).toBeVisible();
      if (reference.kind === 'image') {
        await expect
          .poll(() =>
            reference.block.evaluate((element) => {
              const image = element as HTMLImageElement;
              return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
            })
          )
          .toBe(true);
      } else {
        const href = await reference.block.getAttribute('href');
        expect(href, 'A metafield reference link should have a destination').toBeTruthy();
        expect(href).not.toBe('#');
      }
    }

    return true;
  }

  async expectProductImagesLoad(productName: string): Promise<void> {
    const galleryImages = this.page.locator(
      `button[aria-label^="Load image"][aria-label$="in gallery view"] img[alt="${productName}"]`
    );

    await expect(galleryImages.first()).toBeVisible();
    await expect
      .poll(
        () =>
          galleryImages.evaluateAll((images) =>
            images.length > 0 &&
            images.every((image) => {
              const img = image as HTMLImageElement;
              return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
            })
          ),
        { message: `All ${productName} gallery images should load successfully` }
      )
      .toBe(true);
  }

  async expectProductHeroImageLoadsEfficiently(): Promise<void> {
    const heroImage = this.page.locator('[data-swiper-viewer] .swiper-slide-active img').first();
    await expect(heroImage).toBeVisible();
    const heroBounds = await heroImage.boundingBox();
    expect(heroBounds, 'The initial product hero image should have visible dimensions').not.toBeNull();
    const viewport = this.page.viewportSize();
    expect(viewport, 'The hero image visibility check requires a defined viewport').not.toBeNull();
    if (!heroBounds || !viewport) {
      return;
    }
    expect(heroBounds.y, 'The initial hero image should begin above the fold').toBeLessThan(
      viewport.height
    );
    expect(
      heroBounds.y + heroBounds.height,
      'The initial hero image should be fully above the fold'
    ).toBeLessThanOrEqual(viewport.height);

    await expect
      .poll(() =>
        heroImage.evaluate((image) => {
          const img = image as HTMLImageElement;
          return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
        })
      )
      .toBe(true);

    const heroMetrics = await heroImage.evaluate((image) => {
      const img = image as HTMLImageElement;
      const resource = performance
        .getEntriesByName(img.currentSrc, 'resource')
        .at(-1) as PerformanceResourceTiming | undefined;
      return {
        loading: img.loading,
        fetchPriority: img.fetchPriority,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        source: img.currentSrc,
        resourceDuration: resource?.duration ?? null,
        resourceStartTime: resource?.startTime ?? null,
        loadEventEnd: performance.timing.loadEventEnd - performance.timing.navigationStart
      };
    });

    expect(heroMetrics.loading, 'The initial hero image should not be lazy-loaded').not.toBe('lazy');
    expect(heroMetrics.fetchPriority).not.toBe('low');
    expect(heroMetrics.naturalWidth).toBeGreaterThan(0);
    expect(heroMetrics.naturalHeight).toBeGreaterThan(0);
    expect(heroMetrics.source).toMatch(/^https?:\/\//);
    expect(heroMetrics.resourceDuration, 'The hero image should have a resource timing entry').not.toBeNull();
    expect(heroMetrics.resourceStartTime, 'The hero image request should be measured').not.toBeNull();
    expect(
      heroMetrics.resourceStartTime!,
      'The hero image should start loading before the page load event'
    ).toBeLessThanOrEqual(heroMetrics.loadEventEnd);
    expect(
      heroMetrics.resourceDuration!,
      'The hero image should complete its network load within five seconds'
    ).toBeLessThanOrEqual(5000);
  }

  async expectCumulativeLayoutShiftBelow(threshold = 0.1): Promise<void> {
    const result = await this.page.evaluate(() => {
      const browserWindow = window as Window & {
        __layoutShiftEntries?: Array<{ value: number; hadRecentInput: boolean }>;
        __layoutShiftSupported?: boolean;
      };
      return {
        supported: browserWindow.__layoutShiftSupported ?? false,
        score: (browserWindow.__layoutShiftEntries ?? [])
          .filter((entry) => !entry.hadRecentInput)
          .reduce((total, entry) => total + entry.value, 0)
      };
    });

    expect(result.supported, 'This browser should support layout-shift performance entries').toBe(
      true
    );
    expect(
      result.score,
      `Cumulative layout shift should remain below ${threshold}`
    ).toBeLessThan(threshold);
  }

  async expectThirdPartyScriptsDoNotBlockPdp(productName: string): Promise<void> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      const externalScripts = Array.from(document.scripts).filter(
        (script) => script.src && new URL(script.src).origin !== location.origin
      );
      const parserBlockingScripts = externalScripts.filter(
        (script) => !script.async && !script.defer && script.type !== 'module'
      );
      return {
        domContentLoaded: navigation?.domContentLoadedEventEnd ?? null,
        externalScriptCount: externalScripts.length,
        parserBlockingScripts: parserBlockingScripts.map((script) => script.src)
      };
    });

    expect(metrics.domContentLoaded, 'Navigation timing should expose DOMContentLoaded').not.toBeNull();
    expect(metrics.externalScriptCount, 'The page should load third-party scripts').toBeGreaterThan(
      0
    );
    expect(
      metrics.parserBlockingScripts,
      'Third-party scripts should not block HTML parsing'
    ).toEqual([]);
    expect(
      metrics.domContentLoaded!,
      'The PDP should become interactive within eight seconds of navigation'
    ).toBeLessThanOrEqual(8000);

    await expect(this.productTitle).toHaveText(new RegExp(productName, 'i'));
    await expect(this.productPrice).toBeVisible();
    const quantity = this.page.locator('input.quantity__input:visible').first();
    await expect(quantity).toHaveValue('1');
    await this.page.getByRole('button', { name: `Increase quantity for ${productName}` }).click();
    await expect(quantity).toHaveValue('2');
    await this.page.getByRole('button', { name: `Decrease quantity for ${productName}` }).click();
    await expect(quantity).toHaveValue('1');
    await this.addToCartButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    await expect(cartDrawer.locator('input.quantity__input:visible').first()).toHaveValue('1');
  }

  async expectProductStructuredData(productName: string): Promise<void> {
    const structuredData = await this.page.locator('script[type="application/ld+json"]').evaluateAll(
      (scripts) => {
        const products: Array<{
          name?: unknown;
          id?: unknown;
          description?: unknown;
          image?: unknown;
          sku?: unknown;
          brand?: { name?: unknown };
          offers?: {
            price?: unknown;
            priceCurrency?: unknown;
            availability?: unknown;
            url?: unknown;
          };
        }> = [];
        const parseErrors: string[] = [];

        const visit = (value: unknown): void => {
          if (Array.isArray(value)) {
            value.forEach(visit);
            return;
          }
          if (typeof value !== 'object' || value === null) {
            return;
          }

          const record = value as Record<string, unknown>;
          const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
          if (types.includes('Product')) {
            const brand =
              typeof record.brand === 'object' && record.brand !== null
                ? (record.brand as { name?: unknown })
                : undefined;
            const offers =
              typeof record.offers === 'object' && record.offers !== null
                ? (record.offers as {
                    price?: unknown;
                    priceCurrency?: unknown;
                    availability?: unknown;
                    url?: unknown;
                  })
                : undefined;
            products.push({
              name: record.name,
              id: record['@id'],
              description: record.description,
              image: record.image,
              sku: record.sku,
              brand,
              offers
            });
          }

          Object.values(record).forEach(visit);
        };

        for (const script of scripts) {
          try {
            visit(JSON.parse(script.textContent ?? ''));
          } catch (error) {
            parseErrors.push(error instanceof Error ? error.message : String(error));
          }
        }

        return { products, parseErrors };
      }
    );

    expect(
      structuredData.parseErrors,
      'JSON-LD scripts should contain valid JSON'
    ).toEqual([]);
    const product = structuredData.products.find((item) => item.name === productName);
    expect(product, `JSON-LD should include a Product for ${productName}`).toBeDefined();
    expect(product!.id).toBe(`${this.page.url().split('?')[0]}#product`);
    expect(product!.description).toEqual(expect.any(String));
    expect((product!.description as string).trim().length).toBeGreaterThan(0);
    expect(product!.image).toEqual(expect.anything());
    expect(product!.sku).toEqual(expect.any(String));
    expect((product!.sku as string).trim().length).toBeGreaterThan(0);
    expect(product!.brand?.name).toEqual(expect.any(String));

    expect(product!.offers, 'The Product schema should include an Offer').toBeDefined();
    expect(Number(product!.offers!.price)).toBeGreaterThan(0);
    expect(product!.offers!.priceCurrency).toBe('USD');
    expect(product!.offers!.availability).toMatch(/schema\.org\/InStock$/);
    expect(product!.offers!.url).toBe(this.page.url().split('?')[0]);
  }

  async expectProductVendor(productName: string, expectedVendor: string): Promise<void> {
    const productUrl = new URL(this.page.url());
    productUrl.search = '';
    productUrl.hash = '';
    const response = await this.page.request.get(`${productUrl.toString()}.js`);
    expect(response.status(), 'The Shopify product endpoint should return successfully').toBe(200);

    const payload: unknown = await response.json();
    expect(payload, 'The Shopify product endpoint should return an object').toEqual(
      expect.objectContaining({
        title: productName,
        vendor: expectedVendor
      })
    );

    const products = await this.readProductSchemaRecords(productName);
    const brandProduct = products.find(
      (product) => typeof product.brand === 'object' && product.brand !== null
    );
    expect(brandProduct, 'Product structured data should include a brand').toBeDefined();
    const brand = (brandProduct!.brand as { name?: unknown }).name;
    expect(brand, 'The Product structured-data brand should match the Shopify vendor').toBe(
      expectedVendor
    );
  }

  async expectDisplayedCompareAtPriceAndDiscount(productName: string): Promise<void> {
    const productUrl = new URL(this.page.url());
    productUrl.search = '';
    productUrl.hash = '';
    const response = await this.page.request.get(`${productUrl.toString()}.js`);
    expect(response.status(), 'The Shopify product endpoint should return successfully').toBe(200);

    const payload: unknown = await response.json();
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('title' in payload) ||
      payload.title !== productName ||
      !('variants' in payload) ||
      !Array.isArray(payload.variants)
    ) {
      throw new Error(`Shopify product data is missing variants for ${productName}`);
    }

    const selectedVariantId = await this.page
      .locator('input.product-variant-id')
      .first()
      .getAttribute('value');
    expect(selectedVariantId, 'The PDP should identify its selected Shopify variant').toBeTruthy();
    const variant = payload.variants.find(
      (entry): entry is Record<string, unknown> =>
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry &&
        String(entry.id) === selectedVariantId
    );
    expect(variant, 'The selected Shopify variant should be in the product data').toBeDefined();
    expect(typeof variant!.price).toBe('number');
    const oneTimePriceCents = variant!.price as number;
    expect(Number.isInteger(oneTimePriceCents)).toBe(true);
    expect(oneTimePriceCents).toBeGreaterThan(0);

    const readDisplayedCents = async (locator: Locator, description: string): Promise<number> => {
      const text = (await locator.innerText()).replace(/,/g, '');
      const amount = text.match(/\$(\d+(?:\.\d{1,2})?)/);
      expect(amount, `${description} should show a USD price`).not.toBeNull();
      return Math.round(Number(amount![1]) * 100);
    };
    const subscriptionPriceCents = await readDisplayedCents(
      this.subscriptionLabel,
      'The subscription option'
    );
    const displayedOneTimePriceCents = await readDisplayedCents(
      this.oneTimeLabel,
      'The one-time purchase option'
    );
    expect(displayedOneTimePriceCents).toBe(oneTimePriceCents);

    const compareAtPrice = variant!.compare_at_price;
    const compareAtPriceElements = this.page.locator(
      '.product-subscription-buy-box__wrapper s, .product-subscription-buy-box__wrapper del, .product-subscription-buy-box__wrapper [class*="compare-at-price"], .product-subscription-buy-box__wrapper [class*="compare_at_price"]'
    );
    if (typeof compareAtPrice === 'number' && compareAtPrice > oneTimePriceCents) {
      await expect(
        compareAtPriceElements,
        'A Shopify compare-at price should be shown in the purchase options'
      ).not.toHaveCount(0);
      const displayedCompareAtCents = await readDisplayedCents(
        compareAtPriceElements.first(),
        'The compare-at price'
      );
      expect(displayedCompareAtCents).toBe(compareAtPrice);
    } else {
      await expect(
        compareAtPriceElements,
        'The PDP should not show a compare-at price when Shopify has none'
      ).toHaveCount(0);
    }

    await expect(this.subscriptionLabel).toContainText(/Subscribe\s*&\s*Save\s+10%/i);
    const expectedSubscriptionPriceCents = Math.round(oneTimePriceCents * 0.9);
    expect(
      Math.abs(subscriptionPriceCents - expectedSubscriptionPriceCents),
      'The subscription price should reflect the displayed 10% discount, rounded to cents'
    ).toBeLessThanOrEqual(1);
  }

  async expectProductTypeDisplays(productName: string, expectedTag: string, displayName: string): Promise<void> {
    const productUrl = new URL(this.page.url());
    productUrl.search = '';
    productUrl.hash = '';
    const response = await this.page.request.get(`${productUrl.toString()}.js`);
    expect(response.status(), 'The Shopify product endpoint should return successfully').toBe(200);

    const payload: unknown = await response.json();
    expect(payload, 'The Shopify product should have the expected product type tag').toEqual(
      expect.objectContaining({
        title: productName,
        tags: expect.arrayContaining([expectedTag])
      })
    );
    await expect(
      this.page.getByText(displayName, { exact: true }),
      `The product page should display its ${displayName} type`
    ).toBeVisible();
  }

  async expectProductTagsDisplayCorrectly(productName: string): Promise<void> {
    const productUrl = new URL(this.page.url());
    productUrl.search = '';
    productUrl.hash = '';
    const response = await this.page.request.get(`${productUrl.toString()}.js`);
    expect(response.status(), 'The Shopify product endpoint should return successfully').toBe(200);

    const payload: unknown = await response.json();
    expect(payload, 'The Shopify product endpoint should return a product').toEqual(
      expect.objectContaining({ title: productName })
    );
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('tags' in payload) ||
      !Array.isArray(payload.tags)
    ) {
      throw new Error(`Shopify product data should include a tags array for ${productName}`);
    }

    const productTags = payload.tags.filter(
      (tag): tag is string => typeof tag === 'string' && tag.trim().length > 0
    );
    expect(productTags, 'Shopify product tags should be non-empty strings').toHaveLength(
      payload.tags.length
    );
    expect(productTags, `Shopify should provide at least one tag for ${productName}`).not.toHaveLength(
      0
    );

    const tagLabels = await this.page
      .locator(
        'a[rel~="tag"], [data-product-tag], .product-tag, .product-tag-list > *, .product-tags > *, .product__tags > *, .card__product-tags > *, .product-card__tags > *'
      )
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0;
          })
          .map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim())
          .filter((text) => text.length > 0)
      );
    const normalize = (text: string) =>
      text.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizedTags = productTags.map(normalize);

    for (const label of tagLabels) {
      expect(
        normalizedTags,
        `Visible product tag "${label}" should match Shopify product tags`
      ).toContain(normalize(label));
    }
  }

  async expectBreadcrumbSchema(productName: string): Promise<void> {
    const scripts = await this.page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((elements) => elements.map((element) => element.textContent ?? ''));
    const breadcrumbLists: Record<string, unknown>[] = [];
    const parseErrors: string[] = [];

    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (typeof value !== 'object' || value === null) {
        return;
      }

      const record = value as Record<string, unknown>;
      const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
      if (types.includes('BreadcrumbList')) {
        breadcrumbLists.push(record);
      }
      Object.values(record).forEach(visit);
    };

    for (const script of scripts) {
      try {
        visit(JSON.parse(script));
      } catch (error) {
        parseErrors.push(error instanceof Error ? error.message : String(error));
      }
    }

    expect(parseErrors, 'JSON-LD scripts should contain valid JSON').toEqual([]);
    expect(
      breadcrumbLists,
      'The product page should publish exactly one BreadcrumbList'
    ).toHaveLength(1);

    const itemListElement = breadcrumbLists[0].itemListElement;
    expect(itemListElement, 'BreadcrumbList should have an ordered itemListElement').toEqual(
      expect.any(Array)
    );
    const items = itemListElement as Array<{
      position?: unknown;
      item?: unknown;
      name?: unknown;
    }>;
    const expectedItems = [
      { name: 'Home', url: new URL('/', this.page.url()).toString() },
      { name: 'Shop', url: new URL('/collections/protein-bars', this.page.url()).toString() },
      { name: productName, url: new URL(this.page.url()).origin + new URL(this.page.url()).pathname }
    ];

    expect(items).toHaveLength(expectedItems.length);
    for (const [index, expected] of expectedItems.entries()) {
      const item = items[index];
      expect(item.position, `Breadcrumb ${index + 1} should have the correct position`).toBe(
        index + 1
      );
      expect(item.name, `Breadcrumb ${index + 1} should have the correct name`).toBe(expected.name);

      const itemValue = item.item;
      const itemUrl =
        typeof itemValue === 'string'
          ? itemValue
          : typeof itemValue === 'object' && itemValue !== null
            ? (itemValue as Record<string, unknown>)['@id'] ??
              (itemValue as Record<string, unknown>).url
            : undefined;
      expect(itemUrl, `Breadcrumb "${expected.name}" should have the correct URL`).toBe(
        expected.url
      );
    }
  }

  private async readProductSchemaRecords(productName: string): Promise<
    Array<{
      name?: unknown;
      brand?: unknown;
      offers?: unknown;
      aggregateRating?: unknown;
      review?: unknown;
    }>
  > {
    const result = await this.page.locator('script[type="application/ld+json"]').evaluateAll(
      (scripts) => {
        const products: Array<{
          name?: unknown;
          brand?: unknown;
          offers?: unknown;
          aggregateRating?: unknown;
          review?: unknown;
        }> = [];
        const parseErrors: string[] = [];

        const visit = (value: unknown): void => {
          if (Array.isArray(value)) {
            value.forEach(visit);
            return;
          }
          if (typeof value !== 'object' || value === null) {
            return;
          }

          const record = value as Record<string, unknown>;
          const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
          if (types.includes('Product')) {
            products.push({
              name: record.name,
              brand: record.brand,
              offers: record.offers,
              aggregateRating: record.aggregateRating,
              review: record.review
            });
          }
          Object.values(record).forEach(visit);
        };

        for (const script of scripts) {
          try {
            visit(JSON.parse(script.textContent ?? ''));
          } catch (error) {
            parseErrors.push(error instanceof Error ? error.message : String(error));
          }
        }
        return { products, parseErrors };
      }
    );

    expect(result.parseErrors, 'JSON-LD scripts should contain valid JSON').toEqual([]);
    const records = result.products.filter((record) => record.name === productName);
    expect(records.length, `Product schema records should exist for ${productName}`).toBeGreaterThan(
      0
    );
    return records;
  }

  async expectProductSchemaPriceMatchesDisplayedPrice(productName: string): Promise<void> {
    const products = await this.readProductSchemaRecords(productName);
    const offerProduct = products.find(
      (record) => typeof record.offers === 'object' && record.offers !== null
    );
    expect(offerProduct, 'Product schema should contain an Offer').toBeDefined();
    const offer = offerProduct!.offers as { price?: unknown; priceCurrency?: unknown };

    const oneTimePrice = this.oneTimeLabel.locator('.product-subscription-buy-box__current-price');
    const displayedPrice = (await oneTimePrice.innerText()).trim();
    const displayedAmount = Number(displayedPrice.replace(/[^0-9.]/g, ''));
    expect(Number.isFinite(displayedAmount)).toBe(true);
    expect(Number(offer.price)).toBe(displayedAmount);
    expect(offer.priceCurrency).toBe('USD');
  }

  async expectProductSchemaAvailabilityMatchesLiveVariant(productName: string): Promise<void> {
    const products = await this.readProductSchemaRecords(productName);
    const offerProduct = products.find(
      (record) => typeof record.offers === 'object' && record.offers !== null
    );
    expect(offerProduct, 'Product schema should contain an Offer').toBeDefined();
    const offer = offerProduct!.offers as { availability?: unknown };

    const liveAvailability = await this.page.evaluate(async () => {
      const response = await fetch(`${location.pathname}.js`);
      if (!response.ok) {
        throw new Error(`Product availability request failed with HTTP ${response.status}`);
      }
      const product = (await response.json()) as {
        variants?: Array<{ id?: number; available?: boolean }>;
      };
      const variantId = Number(
        document.querySelector<HTMLInputElement>('form[action*="/cart/add"] [name="id"]')?.value
      );
      const variant = product.variants?.find((item) => item.id === variantId);
      if (!variant || typeof variant.available !== 'boolean') {
        throw new Error(`Availability was not returned for selected variant ${variantId}`);
      }
      return variant.available;
    });

    const expectedAvailability = liveAvailability
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';
    expect(offer.availability).toBe(expectedAvailability);
  }

  async expectReviewSchemaMatchesReviewWidget(productName: string): Promise<void> {
    const products = await this.readProductSchemaRecords(productName);
    const reviewProduct = products.find(
      (record) => typeof record.aggregateRating === 'object' && record.aggregateRating !== null
    );
    expect(reviewProduct, 'Product schema should include aggregate review data').toBeDefined();
    const aggregate = reviewProduct!.aggregateRating as {
      ratingValue?: unknown;
      reviewCount?: unknown;
      bestRating?: unknown;
      worstRating?: unknown;
    };
    const reviewSummary = this.page.locator('.jdgm-preview-badge').first()
      .locator('.jdgm-prev-badge');
    const widgetRating = Number(await reviewSummary.getAttribute('data-average-rating'));
    const widgetCount = Number(await reviewSummary.getAttribute('data-number-of-reviews'));
    expect(Number(aggregate.ratingValue)).toBe(widgetRating);
    expect(Number(aggregate.reviewCount)).toBe(widgetCount);
    expect(Number(aggregate.bestRating)).toBe(5);
    expect(Number(aggregate.worstRating)).toBe(1);

    const reviews = reviewProduct!.review;
    expect(Array.isArray(reviews), 'Review schema should include individual reviews').toBe(true);
    expect((reviews as unknown[]).length).toBeGreaterThan(0);
    for (const reviewValue of reviews as unknown[]) {
      expect(typeof reviewValue).toBe('object');
      expect(reviewValue).not.toBeNull();
      const review = reviewValue as {
        reviewRating?: { ratingValue?: unknown; bestRating?: unknown; worstRating?: unknown };
        author?: { name?: unknown };
        reviewBody?: unknown;
        datePublished?: unknown;
      };
      const rating = Number(review.reviewRating?.ratingValue);
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(5);
      expect(Number(review.reviewRating?.bestRating)).toBe(5);
      expect(Number(review.reviewRating?.worstRating)).toBe(1);
      expect(typeof review.author?.name).toBe('string');
      expect((review.author?.name as string).trim().length).toBeGreaterThan(0);
      expect(typeof review.reviewBody).toBe('string');
      expect((review.reviewBody as string).trim().length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(String(review.datePublished)))).toBe(false);
    }
  }

  async expectProductCanonicalUrl(productName: string): Promise<void> {
    await expect(this.productTitle).toHaveText(new RegExp(productName, 'i'));
    const expectedUrl = new URL(this.page.url());
    expectedUrl.search = '';
    expectedUrl.hash = '';
    const canonical = this.page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', expectedUrl.toString());
  }

  async expectProductMetaTitle(productName: string): Promise<void> {
    const title = await this.page.title();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).toMatch(new RegExp(productName, 'i'));
    expect(title).toMatch(/TiLT PROTEIN/i);
    await expect(this.page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
  }

  async expectProductMetaDescription(productName: string): Promise<void> {
    const description = this.page.locator('meta[name="description"]');
    await expect(description).toHaveCount(1);
    const content = (await description.getAttribute('content'))?.trim() ?? '';
    expect(content.length, 'The meta description should contain useful text').toBeGreaterThanOrEqual(
      50
    );
    expect(content).toMatch(new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    await expect(this.page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      content
    );
  }

  async expectUtmParametersDoNotBreakPdp(
    productName: string,
    alternateVariant: string
  ): Promise<void> {
    const expectedUtm = {
      utm_source: 'playwright',
      utm_medium: 'regression',
      utm_campaign: 'pdp-query-check'
    };
    const initialUrl = new URL(this.page.url());
    for (const [key, value] of Object.entries(expectedUtm)) {
      expect(initialUrl.searchParams.get(key)).toBe(value);
    }

    await expect(this.productTitle).toHaveText(new RegExp(productName, 'i'));
    await expect(this.productPrice).toBeVisible();
    await expect(this.addToCartButton).toBeEnabled();

    await this.selectVariant(alternateVariant);
    await expect(this.productTitle).toHaveText(new RegExp(alternateVariant, 'i'));
    await expect(this.productPrice).toBeVisible();

    const quantity = this.page.locator('input.quantity__input:visible').first();
    await expect(quantity).toHaveValue('1');
    await this.page.getByRole('button', {
      name: `Increase quantity for ${alternateVariant}`
    }).click();
    await expect(quantity).toHaveValue('2');

    await this.addToCartButton.click();
    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(alternateVariant).first()).toBeVisible({
      timeout: 15000
    });
    await expect(cartDrawer.locator('input.quantity__input:visible').first()).toHaveValue('2');
  }

  async expectPdpRemainsUsableOnSlowNetwork(productName: string): Promise<void> {
    await expect(this.productTitle).toHaveText(new RegExp(productName, 'i'), {
      timeout: 30000
    });
    await expect(this.productPrice).toBeVisible({ timeout: 30000 });
    await expect(this.addToCartButton).toBeEnabled({ timeout: 30000 });

    const quantity = this.page.locator('input.quantity__input:visible').first();
    await expect(quantity).toHaveValue('1');
    await this.page.getByRole('button', { name: `Increase quantity for ${productName}` }).click();
    await expect(quantity).toHaveValue('2');
    await this.page.getByRole('button', { name: `Decrease quantity for ${productName}` }).click();
    await expect(quantity).toHaveValue('1');

    await this.addToCartButton.click();
    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 30000 });
    await expect(cartDrawer.locator('input.quantity__input:visible').first()).toHaveValue('1');
  }

  async expectVariantChangeDuringAddToCartKeepsSubmittedVariant(
    productName: string,
    variantId: string,
    alternateVariant: string,
    alternateVariantId: string
  ): Promise<void> {
    let submittedVariantId: string | undefined;
    let markAddReceivedByStore!: () => void;
    let finishAddResponse!: () => void;
    const addReceivedByStore = new Promise<void>((resolve) => {
      markAddReceivedByStore = resolve;
    });
    const addResponseFinished = new Promise<void>((resolve) => {
      finishAddResponse = resolve;
    });

    await this.page.route('**/cart/add*', async (route) => {
      const postData = route.request().postData() ?? '';
      const contentType = (await route.request().headerValue('content-type')) ?? '';
      if (contentType.includes('application/json')) {
        const payload = JSON.parse(postData) as {
          id?: string | number;
          items?: Array<{ id?: string | number }>;
        };
        const id = payload.id ?? payload.items?.[0]?.id;
        submittedVariantId = id === undefined ? undefined : String(id);
      } else {
        const formData = new URLSearchParams(postData);
        submittedVariantId =
          formData.get('id') ?? formData.get('items[0][id]') ?? undefined;
        if (submittedVariantId === undefined) {
          submittedVariantId = postData.match(/name="id"\r?\n\r?\n(\d+)/)?.[1];
        }
      }
      try {
        const response = await route.fetch();
        markAddReceivedByStore();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({ response });
      } finally {
        finishAddResponse();
      }
    });

    await expect(this.productTitle).toHaveText(new RegExp(productName, 'i'));
    const addRequest = this.page.waitForRequest(
      (request) => request.method() === 'POST' && new URL(request.url()).pathname.includes('/cart/add'),
      { timeout: 15000 }
    );
    await this.addToCartButton.click();
    await addRequest;
    await expect.poll(() => submittedVariantId).toBe(variantId);
    await addReceivedByStore;

    const alternateFlavor = this.productFlavorOptions
      .filter({ hasText: alternateVariant })
      .first();
    await expect(alternateFlavor).toBeVisible();
    await alternateFlavor.click();
    await expect(this.page).toHaveURL(
      new RegExp(`/products/${alternateVariant.toLowerCase().replace(/\s+/g, '-')}(?:[?#]|$)`),
      { timeout: 30000 }
    );
    await expect(this.productTitle).toHaveText(new RegExp(alternateVariant, 'i'));
    await addResponseFinished;

    await this.page.getByRole('button', { name: /cart/i }).first().click();
    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName, { exact: true }).first()).toBeVisible({
      timeout: 15000
    });
    await expect(cartDrawer.getByText(alternateVariant, { exact: true })).toHaveCount(0);
    const cartItem = cartDrawer.locator('.cart-item').filter({ hasText: productName }).first();
    await expect(cartItem.locator('a.cart-item__name')).toHaveAttribute(
      'href',
      new RegExp(`/products/${productName.toLowerCase().replace(/\s+/g, '-')}(?:\\?|$)`)
    );
    expect(submittedVariantId).toBe(variantId);
    expect(submittedVariantId).not.toBe(alternateVariantId);
  }

  async expectAddToCartRecoversAfterGoingOffline(productName: string): Promise<void> {
    const addRequestFailed = this.page.waitForEvent('requestfailed', {
      predicate: (request) =>
        request.method() === 'POST' &&
        new URL(request.url()).pathname.includes('/cart/add'),
      timeout: 15000
    });

    await this.page.context().setOffline(true);
    try {
      await this.addToCartButton.click();
      await addRequestFailed;

      await expect(this.page).toHaveURL(/\/products\//);
      await expect(this.productTitle).toContainText(productName);
      await expect(this.addToCartButton).toBeEnabled();
      await expect(
        this.page.locator('cart-drawer .cart-item').filter({ hasText: productName })
      ).toHaveCount(0);
    } finally {
      await this.page.context().setOffline(false);
    }

    await this.addToCartButton.click();
    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
  }

  async expectStickyAddToCartWorksOnMobile(productName: string): Promise<void> {
    const purchaseControl = this.page.locator('.product-subscription-buy-box__wrapper').first();
    const stickyCart = this.page.locator('sticky-cart-bar').first();
    const stickyAddToCart = stickyCart.locator('button[name="add"]').first();

    await expect(purchaseControl).toBeVisible();
    await purchaseControl.scrollIntoViewIfNeeded();
    await this.page.evaluate(() => {
      window.scrollBy({ top: Math.max(500, window.innerHeight), behavior: 'instant' });
    });

    await expect(stickyCart).toHaveClass(/is-visible/, { timeout: 10000 });
    await expect(stickyAddToCart).toBeVisible();
    await expect(stickyAddToCart).toBeInViewport();
    await expect(stickyAddToCart).toBeEnabled();
    await stickyAddToCart.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
  }

  async expectDifferentImageAspectRatiosKeepLayout(): Promise<void> {
    const originalViewport = this.page.viewportSize();
    expect(originalViewport, 'The product gallery test requires a defined viewport').not.toBeNull();
    if (!originalViewport) {
      return;
    }

    const gallery = this.page.locator('[data-swiper-viewer]');
    const thumbnails = this.page.locator(
      'button[aria-label^="Load image"][aria-label$="in gallery view"]'
    );
    const aspectRatios: number[] = [];

    for (const width of [...new Set([originalViewport.width, 390])]) {
      await this.page.setViewportSize({ width, height: originalViewport.height });
      const baseline = { slideWidth: 0, slideHeight: 0, containerWidth: 0, containerHeight: 0 };

      for (let index = 0; index < (await thumbnails.count()); index++) {
        const thumbnail = thumbnails.nth(index);
        await thumbnail.click();
        await expect(thumbnail).toHaveAttribute('aria-current', 'true');

        const activeSlide = gallery.locator('.swiper-slide-active');
        const image = activeSlide.locator('.product-media-container img').first();
        await expect
          .poll(() =>
            image.evaluate((element) => {
              const media = element as HTMLImageElement;
              return media.complete && media.naturalWidth > 0 && media.naturalHeight > 0;
            })
          )
          .toBe(true);

        const measurements = await activeSlide.evaluate((slide) => {
          const image = slide.querySelector('.product-media-container img') as HTMLImageElement;
          const container = slide.querySelector('.product-media-container');
          if (!container) {
            return null;
          }

          const slideBounds = slide.getBoundingClientRect();
          const containerBounds = container.getBoundingClientRect();
          const imageBounds = image.getBoundingClientRect();

          return {
            aspectRatio: image.naturalWidth / image.naturalHeight,
            slideWidth: slideBounds.width,
            slideHeight: slideBounds.height,
            containerWidth: containerBounds.width,
            containerHeight: containerBounds.height,
            imageWidth: imageBounds.width,
            imageHeight: imageBounds.height,
            documentWidth: document.documentElement.clientWidth,
            documentScrollWidth: document.documentElement.scrollWidth
          };
        });

        expect(measurements, 'Each gallery slide should have a media container').not.toBeNull();
        if (!measurements) {
          continue;
        }

        aspectRatios.push(measurements.aspectRatio);
        expect(measurements.slideWidth).toBeGreaterThan(0);
        expect(measurements.slideHeight).toBeGreaterThan(0);
        expect(measurements.containerWidth).toBeGreaterThan(0);
        expect(measurements.containerHeight).toBeGreaterThan(0);
        expect(measurements.imageWidth).toBeLessThanOrEqual(measurements.containerWidth + 1);
        expect(measurements.imageHeight).toBeLessThanOrEqual(measurements.containerHeight + 1);
        expect(measurements.documentScrollWidth).toBeLessThanOrEqual(
          measurements.documentWidth + 1
        );

        if (index === 0) {
          baseline.slideWidth = measurements.slideWidth;
          baseline.slideHeight = measurements.slideHeight;
          baseline.containerWidth = measurements.containerWidth;
          baseline.containerHeight = measurements.containerHeight;
        } else {
          expect(Math.abs(measurements.slideWidth - baseline.slideWidth)).toBeLessThanOrEqual(2);
          expect(Math.abs(measurements.slideHeight - baseline.slideHeight)).toBeLessThanOrEqual(2);
          expect(Math.abs(measurements.containerWidth - baseline.containerWidth)).toBeLessThanOrEqual(
            2
          );
          expect(
            Math.abs(measurements.containerHeight - baseline.containerHeight)
          ).toBeLessThanOrEqual(2);
        }
      }
    }

    const distinctAspectRatios = new Set(aspectRatios.map((ratio) => ratio.toFixed(2)));
    expect(
      distinctAspectRatios.size,
      'The gallery should include images with different intrinsic aspect ratios'
    ).toBeGreaterThan(1);

    await this.page.setViewportSize(originalViewport);
  }

  async prepareProductVideoForPlayback(): Promise<boolean> {
    const slides = this.page.locator('[data-swiper-viewer] .swiper-slide');
    const thumbnails = this.page.locator(
      'button[aria-label^="Load image"][aria-label$="in gallery view"]'
    );

    for (let index = 0; index < (await slides.count()); index++) {
      const slide = slides.nth(index);
      const video = slide.locator('video');
      const deferredMedia = slide.locator('deferred-media');
      const hasVideo = (await video.count()) > 0;
      const hasDeferredMedia = (await deferredMedia.count()) > 0;

      if (!hasVideo && !hasDeferredMedia) {
        continue;
      }

      const thumbnail = thumbnails.nth(index);
      if (await thumbnail.count()) {
        await thumbnail.click();
      }

      if (!hasVideo) {
        await deferredMedia.locator('button').first().click();
      }

      await expect(video.first()).toBeVisible();
      return true;
    }

    return false;
  }

  async expectProductVideoPlaybackWorks(): Promise<void> {
    const video = this.page.locator('[data-swiper-viewer] .swiper-slide-active video').first();
    await expect(video).toBeVisible();

    const initialTime = await video.evaluate((element) => (element as HTMLVideoElement).currentTime);
    await video.evaluate(async (element) => {
      const media = element as HTMLVideoElement;
      media.muted = true;
      await media.play();
    });

    await expect
      .poll(() =>
        video.evaluate((element, startTime) => {
          const media = element as HTMLVideoElement;
          return !media.paused && media.currentTime > startTime;
        }, initialTime)
      )
      .toBe(true);

    await video.evaluate((element) => (element as HTMLVideoElement).pause());
  }

  async expectAllProductThumbnailsWork(productName: string): Promise<void> {
    const thumbnails = this.page.locator(
      `button[aria-label^="Load image"][aria-label$="in gallery view"]`
    );
    const count = await thumbnails.count();
    expect(count, `${productName} should have gallery thumbnails`).toBeGreaterThan(0);

    for (let index = 0; index < count; index++) {
      const thumbnail = thumbnails.nth(index);
      const thumbnailImage = thumbnail.locator(`img[alt="${productName}"]`);

      await expect(thumbnailImage).toBeVisible();
      await expect
        .poll(() =>
          thumbnailImage.evaluate((image) => {
            const img = image as HTMLImageElement;
            return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
          })
        )
        .toBe(true);

      await thumbnail.click();
      await expect(thumbnail).toHaveAttribute('aria-current', 'true');
    }
  }

  async expectProductGallerySwipeWorks(productName: string): Promise<void> {
    await this.page.setViewportSize({ width: 390, height: 844 });

    const gallery = this.page.locator('[data-swiper-viewer]');
    const slides = gallery.locator('.swiper-slide');
    const swiperWrapper = gallery.locator('.swiper-wrapper');
    const activeSlideIndex = () =>
      slides.evaluateAll((items) =>
        items.findIndex((slide) => slide.classList.contains('swiper-slide-active'))
      );

    await expect(gallery).toBeVisible();
    expect(await slides.count(), `${productName} should have multiple gallery slides`).toBeGreaterThan(
      1
    );
    await expect.poll(activeSlideIndex).toBe(0);

    const bounds = await gallery.boundingBox();
    expect(bounds, 'The mobile product gallery should have a swipeable area').not.toBeNull();
    if (!bounds) {
      return;
    }

    await swiperWrapper.evaluate((wrapper) => {
      wrapper.removeAttribute('data-swipe-transition-duration');
      wrapper.removeAttribute('data-swipe-transition-ended');
      wrapper.addEventListener(
        'transitionrun',
        (event) => {
          if (!(event instanceof TransitionEvent) || event.propertyName !== 'transform') {
            return;
          }
          const duration = getComputedStyle(wrapper).transitionDuration
            .split(',')[0]
            .trim();
          const durationSeconds = duration.endsWith('ms')
            ? Number.parseFloat(duration) / 1000
            : Number.parseFloat(duration);
          wrapper.setAttribute(
            'data-swipe-transition-duration',
            String(durationSeconds)
          );
        },
        { once: true }
      );
      wrapper.addEventListener(
        'transitionend',
        (event) => {
          if (event instanceof TransitionEvent && event.propertyName === 'transform') {
            wrapper.setAttribute('data-swipe-transition-ended', 'true');
          }
        },
        { once: true }
      );
    });

    const centerY = bounds.y + bounds.height / 2;
    await this.page.mouse.move(bounds.x + bounds.width * 0.8, centerY);
    await this.page.mouse.down();
    await this.page.mouse.move(bounds.x + bounds.width * 0.2, centerY, { steps: 8 });
    await this.page.mouse.up();

    await expect.poll(activeSlideIndex).toBe(1);
    await expect(swiperWrapper).toHaveAttribute('data-swipe-transition-ended', 'true', {
      timeout: 1500
    });
    const transitionDuration = Number(
      await swiperWrapper.getAttribute('data-swipe-transition-duration')
    );
    expect(
      transitionDuration,
      'The gallery should animate the swipe instead of jumping'
    ).toBeGreaterThan(0);
    expect(
      transitionDuration,
      'The gallery swipe animation should remain responsive'
    ).toBeLessThanOrEqual(0.6);

    const pageWidth = await this.page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport);
  }

  async expectProductImageLightboxWorks(productName: string): Promise<void> {
    const activeSlide = this.page.locator('[data-swiper-viewer] .swiper-slide-active');
    const productImage = activeSlide.locator('img').first();
    await expect(productImage).toBeVisible();
    await expect
      .poll(() =>
        productImage.evaluate((image) => {
          const img = image as HTMLImageElement;
          return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
        })
      )
      .toBe(true);

    const originalBounds = await productImage.boundingBox();
    expect(originalBounds, 'The selected product image should have visible dimensions').not.toBeNull();
    if (!originalBounds) {
      return;
    }

    const mediaToggle = activeSlide.locator('.product__media-toggle');
    await expect(mediaToggle).toHaveAttribute('aria-haspopup', 'dialog');
    await mediaToggle.focus();
    await mediaToggle.press('Enter');

    const mediaDialog = this.page.locator('.product-media-modal__dialog');
    await expect(mediaDialog).toBeVisible();

    const lightboxImage = mediaDialog.locator(`img.active[alt="${productName}"]`);
    await expect(lightboxImage).toBeVisible();
    await expect
      .poll(() =>
        lightboxImage.evaluate((image) => {
          const img = image as HTMLImageElement;
          return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
        })
      )
      .toBe(true);

    const lightboxBounds = await lightboxImage.boundingBox();
    expect(lightboxBounds, 'The lightbox image should have visible dimensions').not.toBeNull();
    expect(lightboxBounds?.width).toBeGreaterThan(originalBounds.width);

    await mediaDialog.locator('.product-media-modal__toggle[aria-label="Close"]').click();
    await expect(mediaDialog).toBeHidden();
    await expect(productImage).toBeVisible();
  }

  async expectProductImageChangesOnVariantChange(otherVariant: string): Promise<void> {
    const currentTitle = (await this.productTitle.textContent())?.trim();
    const currentVariant = currentTitle ?? 'Unknown';
    const currentImage = this.page.locator(`img[alt="${currentVariant}"]`).first();
    const beforeSrc = await currentImage.getAttribute('src');

    await this.selectVariant(otherVariant);

    const updatedImage = this.page.locator(`img[alt="${otherVariant}"]`).first();
    const afterSrc = await updatedImage.getAttribute('src');

    expect(afterSrc).not.toBeNull();
    expect(afterSrc).not.toBe(beforeSrc ?? '');
  }

  async expectSoldOutVariantsAreHandled(): Promise<void> {
    const soldOutVariants = this.productFlavorOptions.filter({ hasText: /sold out/i });
    const count = await soldOutVariants.count();

    for (let i = 0; i < count; i++) {
      const variant = soldOutVariants.nth(i);
      await expect(variant).toContainText(/sold out/i);
      const disabledProperties = [
        await variant.getAttribute('disabled'),
        await variant.getAttribute('aria-disabled'),
        await variant.getAttribute('class')
      ];

      const hasDisabledIndicator = disabledProperties.some((value) =>
        value !== null && /disabled|sold out/i.test(value)
      );

      expect(hasDisabledIndicator).toBeTruthy();
    }
  }

  async expectLowStockMessageIsCorrect(): Promise<boolean> {
    const productInfo = this.page.locator('.product__info-container').first();
    const visibleMessages = await productInfo.evaluate((container) => {
      const messagePattern =
        /\blow stock\b|\bonly\s+\d+\s+(?:left|remaining)\b|\b\d+\s+(?:items?\s+)?left in stock\b|\blimited stock\b|\bselling fast\b/i;

      return Array.from(container.querySelectorAll('*'))
        .filter((element) => element.children.length === 0)
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            bounds.width > 0 &&
            bounds.height > 0 &&
            messagePattern.test(element.textContent ?? '')
          );
        })
        .map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim());
    });
    const messagePattern =
      /\blow stock\b|\bonly\s+\d+\s+(?:left|remaining)\b|\b\d+\s+(?:items?\s+)?left in stock\b|\blimited stock\b|\bselling fast\b/i;

    if (visibleMessages.length === 0) {
      return false;
    }

    expect(visibleMessages, 'A product should show at most one low-stock message').toHaveLength(1);
    const message = visibleMessages[0];
    expect(message, 'Low-stock messaging should match a supported message format').toMatch(
      messagePattern
    );

    const quantityMatch = message.match(
      /\bonly\s+(\d+)\s+(?:left|remaining)\b|\b(\d+)\s+(?:items?\s+)?left in stock\b/i
    );
    if (quantityMatch) {
      const remainingQuantity = Number(quantityMatch[1] ?? quantityMatch[2]);
      expect(
        remainingQuantity,
        'A low-stock message must not report zero or negative stock'
      ).toBeGreaterThan(0);
    }

    return true;
  }

  async expectAddToCartWorks(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.addToCartButton).toBeVisible();
    await this.addToCartButton.click();
    await this.page.waitForTimeout(1500);
    await expect(this.page.getByText(/Your cart \(\d+\)/i).first()).toBeVisible({ timeout: 15000 });
  }

  async expectRapidAddToCartKeepsQuantity(quantity: number, clicks = 3): Promise<void> {
    const productQuantity = this.page.locator('input.quantity__input:visible').first();
    await expect(productQuantity).toBeVisible();
    await productQuantity.fill(String(quantity));
    await expect(productQuantity).toHaveValue(String(quantity));

    const clickResults = await Promise.allSettled(
      Array.from({ length: clicks }, () => this.addToCartButton.click())
    );
    expect(clickResults.some((result) => result.status === 'fulfilled')).toBeTruthy();

    const cartDrawer = this.page.locator('cart-drawer').first();
    const cartQuantity = cartDrawer.locator('input.quantity__input:visible').first();
    await expect(cartQuantity).toBeVisible({ timeout: 15000 });
    await expect(cartQuantity).toHaveValue(String(quantity), { timeout: 15000 });
    await expect(cartDrawer.locator('.cart-item')).toHaveCount(1);
  }

  async expectQuantitySelectorsWorkInPdpAndSideCart(productName: string): Promise<void> {
    const productQuantity = this.page.locator('input.quantity__input:visible').first();
    const productIncreaseButton = this.page.getByRole('button', {
      name: `Increase quantity for ${productName}`
    });
    const productDecreaseButton = this.page.getByRole('button', {
      name: `Decrease quantity for ${productName}`
    });

    await expect(productQuantity).toHaveValue('1');
    await productIncreaseButton.click();
    await expect(productQuantity).toHaveValue('2');
    await productDecreaseButton.click();
    await expect(productQuantity).toHaveValue('1');
    await productDecreaseButton.click();
    await expect(productQuantity).toHaveValue('1');

    await this.addToCartButton.click();
    const cartDrawer = this.page.locator('cart-drawer').first();
    const cartQuantity = cartDrawer.locator('input.quantity__input:visible').first();
    const cartIncreaseButton = cartDrawer.getByRole('button', {
      name: `Increase quantity for ${productName}`
    });
    const cartDecreaseButton = cartDrawer.getByRole('button', {
      name: `Decrease quantity for ${productName}`
    });

    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    await expect(cartQuantity).toHaveValue('1', { timeout: 15000 });
    await cartIncreaseButton.click();
    await expect(cartQuantity).toHaveValue('2');
    await cartDecreaseButton.click();
    await expect(cartQuantity).toHaveValue('1');
    await cartDecreaseButton.click();

    await expect
      .poll(
        async () => {
          const quantity = await cartQuantity.inputValue();
          const [validationMessage, isValid] = await Promise.all([
            cartQuantity.evaluate((input: HTMLInputElement) => input.validationMessage),
            cartQuantity.evaluate((input: HTMLInputElement) => input.validity.valid)
          ]);

          return (
            quantity === '1' ||
            (quantity === '0' &&
              validationMessage === 'This item has a minimum of 1' &&
              !isValid)
          );
        },
        { message: 'At quantity 1, the side cart should prevent quantity 0 or show validation' }
      )
      .toBe(true);
  }

  async expectInvalidManualQuantityIsRejected(productName: string): Promise<void> {
    const invalidValues = ['abc', '!@#'];
    const quantityInputs = [
      this.page.locator('input.quantity__input:visible').first(),
      this.page.locator('cart-drawer input.quantity__input:visible').first()
    ];

    for (let index = 0; index < quantityInputs.length; index++) {
      const quantityInput = quantityInputs[index];

      if (index === 1) {
        await this.addToCartButton.click();
        const cartDrawer = this.page.locator('cart-drawer');
        await expect(cartDrawer.getByText(/Your cart \(\d+\)/i)).toBeVisible({ timeout: 15000 });
        await expect(cartDrawer.getByText(productName).first()).toBeVisible();
      }

      await expect(quantityInput).toHaveAttribute('type', 'number');
      await quantityInput.fill('1');

      for (const invalidValue of invalidValues) {
        await quantityInput.pressSequentially(invalidValue);
        await expect(quantityInput).toHaveValue('1');
      }
    }
  }

  async expectSubscriptionSellingPlanInCart(productName: string): Promise<void> {
    const subscriptionOption = this.page.getByRole('radio', {
      name: /Subscribe & Save 10%/i
    });
    await subscriptionOption.check();
    await expect(subscriptionOption).toBeChecked();

    await this.addToCartButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });

    const cartItem = cartDrawer.locator('.cart-item').filter({ hasText: productName }).first();
    await expect(cartItem.getByText(/1 month subscription with 10% discount/i)).toBeVisible();
    await expect(cartItem.locator('a.cart-item__name')).toHaveAttribute(
      'href',
      /[?&]selling_plan=\d+/
    );
  }

  async expectOneTimePurchaseInCart(productName: string): Promise<void> {
    const oneTimeLabel = this.page.locator('label:has-text("One-time purchase")').first();
    const oneTimeOption = this.page.locator('input[name="purchase_option"][value="onetime"]');

    await oneTimeLabel.click();
    await expect(oneTimeOption).toBeChecked();
    await expect(this.addToCartButton).toContainText('$39.99');
    await this.addToCartButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });

    const cartItem = cartDrawer.locator('.cart-item').filter({ hasText: productName }).first();
    await expect(cartItem.locator('.product-option').first()).toContainText('$39.99');
    await expect(cartItem.locator('a.cart-item__name')).not.toHaveAttribute(
      'href',
      /[?&]selling_plan=\d+/
    );
  }

  async expectSubscriptionPricingAndDiscount(productName: string): Promise<void> {
    const subscriptionLabel = this.page.locator('label:has-text("Subscribe & Save 10%")').first();
    const oneTimeLabel = this.page.locator('label:has-text("One-time purchase")').first();
    const pricePattern = /\$(\d+(?:,\d{3})*\.\d{2})/;

    const oneTimeText = (await oneTimeLabel.innerText()).replace(/,/g, '');
    const oneTimePriceMatch = oneTimeText.match(pricePattern);
    expect(oneTimePriceMatch, 'One-time purchase price should be displayed').not.toBeNull();

    const oneTimePrice = Number(oneTimePriceMatch![1]);
    const expectedSubscriptionPrice = (Math.round(oneTimePrice * 0.9 * 100) / 100).toFixed(2);

    await subscriptionLabel.click();
    const subscriptionOption = this.page.getByRole('radio', {
      name: /Subscribe & Save 10%/i
    });
    await expect(subscriptionOption).toBeChecked();
    await expect(subscriptionLabel).toContainText(/save 10%/i);

    const subscriptionText = (await subscriptionLabel.innerText()).replace(/,/g, '');
    const subscriptionPriceMatch = subscriptionText.match(pricePattern);
    expect(subscriptionPriceMatch, 'Subscription price should be displayed').not.toBeNull();
    expect(subscriptionPriceMatch![1]).toBe(expectedSubscriptionPrice);

    await this.addToCartButton.click();
    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    const cartItem = cartDrawer.locator('.cart-item').filter({ hasText: productName }).first();
    await expect(cartItem.locator('.product-option').first()).toContainText(
      `$${expectedSubscriptionPrice}`
    );
    await expect(cartItem.getByText(/month subscription with 10% discount/i)).toBeVisible();
  }

  async expectViewItemAnalyticsEvent(productName: string): Promise<void> {
    const readViewItemEvent = () =>
      this.page.evaluate(() => {
        const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
        if (!dataLayer) {
          return null;
        }

        for (const entry of dataLayer) {
          if (typeof entry !== 'object' || entry === null) {
            continue;
          }

          const event = entry as Record<string, unknown>;
          const eventType = Array.isArray(entry) ? entry[0] : event['0'];
          const eventName = Array.isArray(entry) ? entry[1] : event['1'];
          const payloadValue = Array.isArray(entry) ? entry[2] : event['2'];

          if (
            eventType !== 'event' ||
            eventName !== 'view_item' ||
            typeof payloadValue !== 'object' ||
            payloadValue === null
          ) {
            continue;
          }

          const payload = payloadValue as Record<string, unknown>;
          const items = payload.items;
          if (!Array.isArray(items) || typeof items[0] !== 'object' || items[0] === null) {
            continue;
          }

          const item = items[0] as Record<string, unknown>;
          if (
            typeof item.name !== 'string' ||
            typeof item.variant !== 'string' ||
            typeof item.price !== 'number' ||
            typeof item.quantity !== 'number' ||
            typeof payload.value !== 'number' ||
            typeof payload.currency !== 'string'
          ) {
            continue;
          }

          return {
            name: item.name,
            variant: item.variant,
            price: item.price,
            quantity: item.quantity,
            value: payload.value,
            currency: payload.currency,
            valueMatchesItemPrice: payload.value === item.price
          };
        }

        return null;
      });

    await expect
      .poll(
        readViewItemEvent,
        { message: 'A populated GA4 view_item event should be pushed to dataLayer' }
      )
      .toMatchObject({
        name: productName,
        variant: 'Pack of 12',
        quantity: 1,
        currency: 'USD',
        valueMatchesItemPrice: true
      });
  }

  async expectAddToCartAnalyticsEvent(productName: string, quantity: number): Promise<void> {
    const productQuantity = this.page.locator('input.quantity__input:visible').first();
    await productQuantity.fill(String(quantity));
    await expect(productQuantity).toHaveValue(String(quantity));

    const initialEventCount = await this.page.evaluate(() => {
      const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
      return dataLayer.filter((entry) => {
        if (typeof entry !== 'object' || entry === null) {
          return false;
        }

        const event = entry as Record<string, unknown>;
        return (Array.isArray(entry) ? entry[1] : event['1']) === 'add_to_cart';
      }).length;
    });

    await this.addToCartButton.click();

    const readNewAddToCartEvent = () =>
      this.page.evaluate((previousEventCount) => {
        const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
        const addToCartEvents = dataLayer.filter((entry) => {
          if (typeof entry !== 'object' || entry === null) {
            return false;
          }

          const event = entry as Record<string, unknown>;
          return (Array.isArray(entry) ? entry[1] : event['1']) === 'add_to_cart';
        });
        const entry = addToCartEvents[previousEventCount];
        if (typeof entry !== 'object' || entry === null) {
          return null;
        }

        const event = entry as Record<string, unknown>;
        const eventType = Array.isArray(entry) ? entry[0] : event['0'];
        const payloadValue = Array.isArray(entry) ? entry[2] : event['2'];
        if (
          eventType !== 'event' ||
          typeof payloadValue !== 'object' ||
          payloadValue === null
        ) {
          return null;
        }

        const payload = payloadValue as Record<string, unknown>;
        const items = payload.items;
        if (!Array.isArray(items) || typeof items[0] !== 'object' || items[0] === null) {
          return null;
        }

        const item = items[0] as Record<string, unknown>;
        if (
          typeof item.name !== 'string' ||
          typeof item.variant !== 'string' ||
          typeof item.price !== 'number' ||
          typeof item.quantity !== 'number' ||
          typeof payload.value !== 'number' ||
          typeof payload.currency !== 'string'
        ) {
          return null;
        }

        return {
          name: item.name,
          variant: item.variant,
          price: item.price,
          quantity: item.quantity,
          value: payload.value,
          currency: payload.currency,
          valueMatchesQuantity: Math.round(payload.value * 100) ===
            Math.round(item.price * item.quantity * 100)
        };
      }, initialEventCount);

    await expect
      .poll(readNewAddToCartEvent, {
        message: 'A populated add_to_cart dataLayer event should fire after adding the product'
      })
      .toMatchObject({
        name: productName,
        variant: 'Pack of 12',
        quantity,
        currency: 'USD',
        valueMatchesQuantity: true
      });
  }

  async expectBeginCheckoutAnalyticsEvent(productName: string, quantity: number): Promise<void> {
    const productQuantity = this.page.locator('input.quantity__input:visible').first();
    await productQuantity.fill(String(quantity));
    await expect(productQuantity).toHaveValue(String(quantity));

    const subscriptionOption = this.page.getByRole('radio', {
      name: /Subscribe & Save 10%/i
    });
    await expect(subscriptionOption).toBeChecked();
    await this.addToCartButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    await cartDrawer.getByRole('button', { name: /checkout/i }).click();
    await expect(this.page).toHaveURL(/\/checkouts\//i, { timeout: 30000 });

    const readBeginCheckoutEvent = () =>
      this.page.evaluate(() => {
        const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];

        for (const entry of dataLayer) {
          if (typeof entry !== 'object' || entry === null) {
            continue;
          }

          const event = entry as Record<string, unknown>;
          const eventType = Array.isArray(entry) ? entry[0] : event['0'];
          const eventName = Array.isArray(entry) ? entry[1] : event['1'];
          const payloadValue = Array.isArray(entry) ? entry[2] : event['2'];
          if (
            eventType !== 'event' ||
            eventName !== 'begin_checkout' ||
            typeof payloadValue !== 'object' ||
            payloadValue === null
          ) {
            continue;
          }

          const payload = payloadValue as Record<string, unknown>;
          const items = payload.items;
          if (!Array.isArray(items) || typeof items[0] !== 'object' || items[0] === null) {
            continue;
          }

          const item = items[0] as Record<string, unknown>;
          if (
            typeof item.name !== 'string' ||
            typeof item.variant !== 'string' ||
            typeof item.price !== 'number' ||
            typeof item.quantity !== 'number' ||
            typeof payload.value !== 'number' ||
            typeof payload.currency !== 'string'
          ) {
            continue;
          }

          return {
            name: item.name,
            variant: item.variant,
            price: item.price,
            quantity: item.quantity,
            value: payload.value,
            currency: payload.currency,
            valueMatchesQuantity:
              Math.round(payload.value * 100) ===
              Math.round(item.price * item.quantity * 100)
          };
        }

        return null;
      });

    await expect
      .poll(readBeginCheckoutEvent, {
        timeout: 15000,
        message: 'A populated begin_checkout dataLayer event should fire on checkout handoff'
      })
      .toMatchObject({
        name: productName,
        variant: 'Pack of 12',
        quantity,
        currency: 'USD',
        valueMatchesQuantity: true
      });
  }

  async expectAnalyticsProductId(
    productName: string,
    productId: string,
    variantId: string
  ): Promise<void> {
    const expectedItemId = `shopify_ZZ_${productId}_${variantId}`;

    const readEventItem = (eventName: string) =>
      this.page.evaluate((name) => {
        const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];

        for (const entry of dataLayer) {
          if (typeof entry !== 'object' || entry === null) {
            continue;
          }

          const event = entry as Record<string, unknown>;
          const eventType = Array.isArray(entry) ? entry[0] : event['0'];
          const currentEventName = Array.isArray(entry) ? entry[1] : event['1'];
          const payloadValue = Array.isArray(entry) ? entry[2] : event['2'];
          if (
            eventType !== 'event' ||
            currentEventName !== name ||
            typeof payloadValue !== 'object' ||
            payloadValue === null
          ) {
            continue;
          }

          const payload = payloadValue as Record<string, unknown>;
          const items = payload.items;
          if (!Array.isArray(items) || typeof items[0] !== 'object' || items[0] === null) {
            continue;
          }

          const item = items[0] as Record<string, unknown>;
          if (
            typeof item.id !== 'string' ||
            typeof item.name !== 'string' ||
            typeof item.variant_id !== 'string' ||
            typeof item.price !== 'number' ||
            typeof item.quantity !== 'number' ||
            typeof payload.value !== 'number' ||
            typeof payload.currency !== 'string' ||
            !Array.isArray(payload.ecomm_prodid)
          ) {
            continue;
          }

          return {
            id: item.id,
            name: item.name,
            variantId: item.variant_id,
            ecommerceProductId: payload.ecomm_prodid[0],
            price: item.price,
            quantity: item.quantity,
            value: payload.value,
            currency: payload.currency,
            valueMatchesQuantity:
              Math.round(payload.value * 100) ===
              Math.round(item.price * item.quantity * 100)
          };
        }

        return null;
      }, eventName);

    const expectedEventDetails = {
      id: expectedItemId,
      name: productName,
      variantId,
      ecommerceProductId: expectedItemId,
      price: 39.99,
      currency: 'USD',
      valueMatchesQuantity: true
    };

    await expect
      .poll(() => readEventItem('view_item'), {
        message: 'view_item should include the expected Shopify product and variant IDs'
      })
      .toMatchObject(expectedEventDetails);

    await expect
      .poll(() => readEventItem('view_item'), {
        message: 'view_item should report the expected item price and USD currency'
      })
      .toMatchObject({
        quantity: 1,
        value: 39.99,
        currency: 'USD',
        valueMatchesQuantity: true
      });

    await this.page.locator('label:has-text("One-time purchase")').first().click();
    await expect(this.page.locator('input[name="purchase_option"][value="onetime"]')).toBeChecked();

    const productQuantity = this.page.locator('input.quantity__input:visible').first();
    await productQuantity.fill('1');
    const initialAddToCartCount = await this.page.evaluate(() => {
      const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
      return dataLayer.filter((entry) => {
        if (typeof entry !== 'object' || entry === null) {
          return false;
        }
        const event = entry as Record<string, unknown>;
        return (Array.isArray(entry) ? entry[1] : event['1']) === 'add_to_cart';
      }).length;
    });
    await this.addToCartButton.click();

    const readNewAddToCartItem = () =>
      this.page.evaluate((previousCount) => {
        const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
        const events = dataLayer.filter((entry) => {
          if (typeof entry !== 'object' || entry === null) {
            return false;
          }
          const event = entry as Record<string, unknown>;
          return (Array.isArray(entry) ? entry[1] : event['1']) === 'add_to_cart';
        });
        const entry = events[previousCount];
        if (typeof entry !== 'object' || entry === null) {
          return null;
        }
        const event = entry as Record<string, unknown>;
        const payloadValue = Array.isArray(entry) ? entry[2] : event['2'];
        if (typeof payloadValue !== 'object' || payloadValue === null) {
          return null;
        }
        const payload = payloadValue as Record<string, unknown>;
        const items = payload.items;
        if (!Array.isArray(items) || typeof items[0] !== 'object' || items[0] === null) {
          return null;
        }
        const item = items[0] as Record<string, unknown>;
        if (
          typeof item.id !== 'string' ||
          typeof item.name !== 'string' ||
          typeof item.variant_id !== 'string' ||
          typeof item.price !== 'number' ||
          typeof item.quantity !== 'number' ||
          typeof payload.value !== 'number' ||
          typeof payload.currency !== 'string' ||
          !Array.isArray(payload.ecomm_prodid)
        ) {
          return null;
        }
        return {
          id: item.id,
          name: item.name,
          variantId: item.variant_id,
          ecommerceProductId: payload.ecomm_prodid[0],
          price: item.price,
          quantity: item.quantity,
          value: payload.value,
          currency: payload.currency,
          valueMatchesQuantity:
            Math.round(payload.value * 100) ===
            Math.round(item.price * item.quantity * 100)
        };
      }, initialAddToCartCount);

    await expect
      .poll(readNewAddToCartItem, {
        message: 'add_to_cart should include the expected Shopify product and variant IDs'
      })
      .toMatchObject(expectedEventDetails);

    await expect
      .poll(readNewAddToCartItem, {
        message: 'add_to_cart should report the expected item price and USD currency'
      })
      .toMatchObject({
        quantity: 1,
        value: 39.99,
        currency: 'USD',
        valueMatchesQuantity: true
      });

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    await cartDrawer.getByRole('button', { name: /checkout/i }).click();
    await expect(this.page).toHaveURL(/\/checkouts\//i, { timeout: 30000 });

    await expect
      .poll(() => readEventItem('begin_checkout'), {
        timeout: 15000,
        message: 'begin_checkout should include the expected Shopify product and variant IDs'
      })
      .toMatchObject(expectedEventDetails);

    await expect
      .poll(() => readEventItem('begin_checkout'), {
        message: 'begin_checkout should report the expected item price and USD currency'
      })
      .toMatchObject({
        quantity: 1,
        value: 39.99,
        currency: 'USD',
        valueMatchesQuantity: true
      });
  }

  async expectAnalyticsEventsFireOnce(productName: string): Promise<void> {
    const countEvents = (eventName: string) =>
      this.page.evaluate((name) => {
        const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
        return dataLayer.filter((entry) => {
          if (typeof entry !== 'object' || entry === null) {
            return false;
          }
          const event = entry as Record<string, unknown>;
          const eventType = Array.isArray(entry) ? entry[0] : event['0'];
          const currentEventName = Array.isArray(entry) ? entry[1] : event['1'];
          return eventType === 'event' && currentEventName === name;
        }).length;
      }, eventName);

    await expect.poll(() => countEvents('view_item')).toBe(1);
    await this.page.waitForTimeout(1000);
    await expect.poll(() => countEvents('view_item')).toBe(1);

    await this.page.locator('label:has-text("One-time purchase")').first().click();
    await expect(this.page.locator('input[name="purchase_option"][value="onetime"]')).toBeChecked();
    const addToCartCountBefore = await countEvents('add_to_cart');
    await this.addToCartButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
    await expect
      .poll(() => countEvents('add_to_cart'))
      .toBe(addToCartCountBefore + 1);
    await this.page.waitForTimeout(1000);
    await expect
      .poll(() => countEvents('add_to_cart'))
      .toBe(addToCartCountBefore + 1);

    await cartDrawer.getByRole('button', { name: /checkout/i }).click();
    await expect(this.page).toHaveURL(/\/checkouts\//i, { timeout: 30000 });
    await expect.poll(() => countEvents('begin_checkout')).toBe(1);
    await this.page.waitForTimeout(1000);
    await expect.poll(() => countEvents('begin_checkout')).toBe(1);
  }

  async expectCartDataTransfersToCheckout(productName: string): Promise<void> {
    const quantity = 2;
    const productQuantity = this.page.locator('input.quantity__input:visible').first();
    await productQuantity.fill(String(quantity));
    await expect(productQuantity).toHaveValue(String(quantity));

    const subscriptionOption = this.page.getByRole('radio', {
      name: /Subscribe & Save 10%/i
    });
    await expect(subscriptionOption).toBeChecked();
    await this.addToCartButton.click();

    const cartDrawer = this.page.locator('cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });

    const cartItem = cartDrawer.locator('.cart-item').filter({ hasText: productName }).first();
    const cartQuantity = cartItem.locator('input[name="updates[]"]');
    const cartPrice = (await cartItem.locator('.cart-item__totals .price--end').innerText()).trim();
    const cartProductLink = cartItem.locator('a.cart-item__name');

    await expect(cartQuantity).toHaveValue(String(quantity));
    await expect(cartProductLink).toHaveAttribute('href', /[?&]selling_plan=\d+/);
    await expect(cartItem).toContainText(/1 month subscription with 10% discount/i);

    await cartDrawer.getByRole('button', { name: /checkout/i }).click();
    await expect(this.page).toHaveURL(/\/checkouts\//i, { timeout: 30000 });

    const checkoutProduct = this.page.getByText(productName, { exact: true }).first();
    await expect(checkoutProduct).toBeVisible({ timeout: 30000 });
    const checkoutRow = this.page.getByRole('row').filter({ hasText: productName }).first();
    await expect(checkoutRow).toContainText(String(quantity));
    await expect(checkoutRow).toContainText(cartPrice);
    await expect(checkoutRow).toContainText(/1 month subscription with 10% discount/i);

    const totalRow = this.page.getByRole('row').filter({ hasText: /^Total/ }).first();
    await expect(totalRow).toContainText(cartPrice);
  }

  async expectBuyNowStartsCheckout(productName: string, quantity: number): Promise<void> {
    const productQuantity = this.page.locator('input.quantity__input:visible').first();
    await expect(productQuantity).toBeVisible();
    await productQuantity.fill(String(quantity));
    await expect(productQuantity).toHaveValue(String(quantity));
    await expect(this.productTitle).toHaveText(new RegExp(productName, 'i'));
    await expect(this.buyNowButton).toBeVisible();
    await this.buyNowButton.click();
    await expect(this.page).toHaveURL(/checkout/i, { timeout: 30000 });
    await expect(this.page.getByText(productName).first()).toBeVisible({ timeout: 30000 });
  }

  async expectCartProductAndVariant(productName: string): Promise<void> {
    const cartDrawer = this.page.locator('cart-drawer, .cart-drawer').first();
    await expect(cartDrawer.getByText(productName).first()).toBeVisible({ timeout: 15000 });
  }

  async expectCartQuantityAndPrice(productName: string, quantity = 2): Promise<void> {
    const increaseButton = this.page
      .locator('.quantity__button')
      .filter({ hasText: new RegExp(`Increase quantity for ${productName}`, 'i') })
      .first();

    await expect(increaseButton).toBeVisible({ timeout: 15000 });
    await increaseButton.click();
    await this.page.waitForTimeout(1500);
    await expect(this.page.getByText(new RegExp(`Your Cart \(${quantity}\)`, 'i')).first()).toBeVisible({ timeout: 15000 });

    const expectedTotal = (quantity * 35.99).toFixed(2);
    await expect(this.page.getByText(`$${expectedTotal}`).first()).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText(/Subtotal/i).first()).toBeVisible({ timeout: 15000 });
  }

  async expectCartCountUpdates(): Promise<void> {
    await expect(this.page.getByText(/Cart · \d+/i).first()).toBeVisible();
    await expect(this.page.getByText(/Your Cart \(\d+\)/i).first()).toBeVisible();
  }

  async expectSellingPriceDisplayed(): Promise<void> {
    await expect(this.subscriptionLabel).toContainText('Subscribe & Save 10%');
    await expect(this.subscriptionLabel).toContainText('$35.99');
    await expect(this.oneTimeLabel).toContainText('One-time purchase');
    await expect(this.oneTimeLabel).toContainText('$39.99');
  }

  async expectCurrencyDisplayed(): Promise<void> {
    await expect(this.subscriptionLabel).toContainText('$');
    await expect(this.oneTimeLabel).toContainText('$');
  }

  async getResponseStatus(url: string): Promise<number | null> {
    const response = await this.page.request.get(url);
    return response.status();
  }
}
