import { expect, Page } from '@playwright/test';

export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  async expectPageToLoadSuccessfully(): Promise<void> {
    await expect(this.page).toHaveURL(/tiltprotein\.com/);
    await this.page.waitForLoadState('domcontentloaded');
  }
}
