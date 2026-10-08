import { devices, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { environment } from '@config/environment';
import { ProductPage } from '@pages/ProductPage';
import { expect, test } from '@fixtures/test-fixtures';

const getProductDetails = (productUrl: string) => {
  const productName = productUrl.includes('chocolate-sea-salt')
    ? 'Chocolate Sea Salt'
    : 'Vanilla Almond';
  return {
    productName,
    alternateVariant:
      productName === 'Chocolate Sea Salt' ? 'Vanilla Almond' : 'Chocolate Sea Salt'
  };
};

const createMobileProductPage = async (
  browser: Browser,
  projectName: string,
  productUrl: string
): Promise<{ context: BrowserContext; page: Page; productPage: ProductPage }> => {
  const device = projectName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();
  const response = await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
  expect(response, 'The mobile PDP should return an HTTP response').not.toBeNull();
  expect(response!.status()).toBeGreaterThanOrEqual(200);
  expect(response!.status()).toBeLessThan(400);
  return { context, page, productPage: new ProductPage(page) };
};

for (const productUrl of environment.pdpUrls) {
  const { productName, alternateVariant } = getProductDetails(productUrl);

  test.describe(`Mobile PDP - ${productName}`, () => {
    test(`TC099 - PDP functionality works on iPhone Safari @P0 @PDP`, async ({
      browser
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'webkit', 'iPhone Safari runs in the WebKit project');
      const { context, page, productPage } = await createMobileProductPage(
        browser,
        testInfo.project.name,
        productUrl
      );
      try {
        await productPage.expectPageToLoadSuccessfully();
        await expect(productPage.productTitle).toContainText(productName);
        await expect(productPage.productPrice).toBeVisible();

        const quantity = page.locator('input.quantity__input:visible').first();
        await expect(quantity).toHaveValue('1');
        await page.getByRole('button', { name: `Increase quantity for ${productName}` }).click();
        await expect(quantity).toHaveValue('2');
        await productPage.addToCartButton.click();
        await expect(page.locator('cart-drawer').getByText(productName).first()).toBeVisible({
          timeout: 15000
        });
      } finally {
        await context.close();
      }
    });

    test(`TC100 - PDP functionality works on Android Chrome @P0 @PDP`, async ({
      browser
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Android Chrome runs in the Chromium project');
      const { context, page, productPage } = await createMobileProductPage(
        browser,
        testInfo.project.name,
        productUrl
      );
      try {
        await productPage.expectPageToLoadSuccessfully();
        await expect(productPage.productTitle).toContainText(productName);
        await expect(productPage.productPrice).toBeVisible();

        const quantity = page.locator('input.quantity__input:visible').first();
        await expect(quantity).toHaveValue('1');
        await page.getByRole('button', { name: `Increase quantity for ${productName}` }).click();
        await expect(quantity).toHaveValue('2');
        await productPage.addToCartButton.click();
        await expect(page.locator('cart-drawer').getByText(productName).first()).toBeVisible({
          timeout: 15000
        });
      } finally {
        await context.close();
      }
    });

    test(`TC101 - Sticky Add to Cart works on mobile @P0 @PDP`, async ({
      browser
    }, testInfo) => {
      const { context, productPage: mobileProductPage } = await createMobileProductPage(
        browser,
        testInfo.project.name,
        productUrl
      );
      try {
        await mobileProductPage.expectPageToLoadSuccessfully();
        await mobileProductPage.expectStickyAddToCartWorksOnMobile(productName);
      } finally {
        await context.close();
      }
    });

    test(`TC102 - Mobile variant selectors work @P0 @PDP`, async ({
      browser
    }, testInfo) => {
      const { context, productPage: mobileProductPage } = await createMobileProductPage(
        browser,
        testInfo.project.name,
        productUrl
      );
      try {
        await mobileProductPage.expectPageToLoadSuccessfully();
        await mobileProductPage.expectFlavorSwatchesMapToVariants(productName, alternateVariant);
      } finally {
        await context.close();
      }
    });

    test(`TC103 - No mobile overlay prevents Add to Cart @P0 @PDP`, async ({
      browser
    }, testInfo) => {
      const { context, productPage: mobileProductPage } = await createMobileProductPage(
        browser,
        testInfo.project.name,
        productUrl
      );
      try {
        await mobileProductPage.expectPageToLoadSuccessfully();
        await mobileProductPage.expectPopupsDoNotBlockPdpActions(productName);
      } finally {
        await context.close();
      }
    });
  });
}
