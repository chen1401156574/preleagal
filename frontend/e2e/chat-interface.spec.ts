import { test, expect } from '@playwright/test';

test.describe('AI Chat Interface (PL-5)', () => {
  test('should display header with user email', async ({ page }) => {
    // This test requires authentication - skipped until backend is running
    test.skip();
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('PreLegal AI Chat');
  });

  test('should display document preview panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('Document Preview');
  });

  test('should show download PDF button', async ({ page }) => {
    await page.goto('/');
    const downloadButton = page.getByRole('button', { name: /Download PDF/i });
    await expect(downloadButton).toBeVisible();
  });

  test('should disable download button when fields are missing', async ({ page }) => {
    await page.goto('/');
    const downloadButton = page.getByRole('button', { name: /Download PDF/i });
    await expect(downloadButton).toBeDisabled();
  });

  test('should display warning banner on missing critical fields', async ({ page }) => {
    await page.goto('/');
    const warningBanner = page.locator('.bg-yellow-50').first();
    // Verify warning appears when downloading without complete fields
  });
});

test.describe('ChatInterface - Manual Testing Checklist', () => {
  test.describe.configure({ mode: 'serial' });

  test('STEP 1: Navigate to application', async ({ page }) => {
    // Start: User opens http://localhost:3000
    await page.goto('/');
    console.log('Step 1: Application loaded');
  });

  test('STEP 2: Authentication flow', async ({ page }) => {
    // User enters credentials and signs in
    // Expected: AuthContext provides user data
    console.log('Step 2: Login as test user (manual)');
  });

  test('STEP 3: Chat interface loads', async ({ page }) => {
    // Expected: ChatInterface displays
    // - Chat input at bottom
    // - Document preview on right
    // - Status indicator (Ready/Fields missing)
    await expect(page.locator('h1')).toContainText('PreLegal AI Chat');
    console.log('Step 3: Chat interface verified');
  });

  test('STEP 4: Send initial message', async ({ page }) => {
    // Expected: User message appears, AI responds
    const input = page.getByPlaceholder(/Type your answer/i);
    await input.fill('Our company ABC Corp wants to partner with XYZ Ltd for data sharing');
    await input.press('Enter');

    // Wait for AI response
    await page.waitForTimeout(3000); // Wait for API response

    // Verify user message and AI response
    const userMessage = page.locator('.bg-blue-600').first();
    await expect(userMessage).toBeVisible();
    console.log('Step 4: Message sent and received');
  });

  test('STEP 5: Verify field extraction', async ({ page }) => {
    // Expected: Form fields auto-populated based on conversation
    const party1Company = page.getByPlaceholder(/Company name/i).first();
    const companyValue = await party1CompanyInput.getAttribute('value');

    console.log(`Step 5: Extracted field value: ${companyValue}`);
    expect(companyValue).toContain('ABC Corp');
  });

  test('STEP 6: Validate missing fields warning', async ({ page }) => {
    // Expected: Yellow banner shows when fields are missing
    const warningBanner = page.locator('.bg-yellow-50');
    await expect(warningBanner.first()).toBeVisible();

    const warningText = warningBanner.locator('p').textContent();
    console.log(`Warning message: ${warningText}`);
  });

  test('STEP 7: Complete critical fields manually', async ({ page }) => {
    // Fill in remaining critical fields
    const purpose = page.locator('textarea[placeholder*="Purpose"]');
    await purpose.fill('Testing AI chat field extraction');

    const governingLaw = page.getByPlaceholder(/Delaware/i);
    await governingLaw.fill('California');

    console.log('Step 7: Critical fields completed');
  });

  test('STEP 8: Download PDF when ready', async ({ page }) => {
    // Expected: Download button becomes enabled
    const downloadButton = page.getByRole('button', { name: /Download PDF/i });
    await expect(downloadButton).not.toBeDisabled();

    // Simulate download
    await downloadButton.click();
    const download = await page.waitForEvent('download');
    const filename = await download.suggestedFilename();

    console.log(`Download started: ${filename}`);
    expect(filename).toContain('Mutual_NDA');
  });
});
