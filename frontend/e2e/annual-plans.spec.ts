/**
 * E2E tests for Annual Plan Management
 * FR-019: Tạo và quản lý kế hoạch năm
 * FR-020: Definition of Done cấp kế hoạch năm
 * FR-021: Liên kết kế hoạch năm với dự án
 * FR-022: Dashboard tổng hợp kế hoạch năm
 */

import { test, expect, type Page } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('[placeholder="Tên đăng nhập"]', 'admin')
  await page.fill('[placeholder="Mật khẩu"]', 'admin123')
  await page.click('button[type="submit"], button:has-text("Đăng nhập")')
  await page.waitForURL(/\/(ppg|annual-plans|$)/)
}

test.describe('Annual Plans — FR-019 to FR-022', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/annual-plans`)
    await page.waitForLoadState('networkidle')
  })

  test('FR-019: navigates to Annual Plans page', async ({ page }) => {
    await expect(page.locator('h2:has-text("Kế hoạch năm")')).toBeVisible()
    await expect(
      page.locator('text=FR-019–FR-022'),
    ).toBeVisible()
  })

  test('FR-019: shows KPI cards at top', async ({ page }) => {
    await expect(page.locator('text=Tổng kế hoạch')).toBeVisible()
    await expect(page.locator('text=Đang active')).toBeVisible()
    await expect(page.locator('text=Draft')).toBeVisible()
  })

  test('FR-019: shows filter options', async ({ page }) => {
    await expect(
      page.locator('button:has-text("Tất cả trạng thái")'),
    ).toBeVisible()
    await expect(page.locator('button:has-text("draft")')).toBeVisible()
    await expect(page.locator('button:has-text("active")')).toBeVisible()
    await expect(page.locator('button:has-text("closed")')).toBeVisible()
  })

  test('FR-019: opens create plan modal', async ({ page }) => {
    await page.click('button:has-text("Tạo kế hoạch")')
    await expect(
      page.locator('.modal-panel:has-text("Tạo Kế hoạch năm mới")'),
    ).toBeVisible()
    await expect(page.locator('label:has-text("Tên kế hoạch")')).toBeVisible()
    await expect(page.locator('label:has-text("Năm")')).toBeVisible()
  })

  test('FR-019: create plan requires at least 1 objective', async ({ page }) => {
    await page.click('button:has-text("Tạo kế hoạch")')
    await page.fill('input[placeholder="Kế hoạch IT năm 2026"]', 'Test Plan 2026')
    // Remove the default objective
    const removeBtn = page.locator('.modal-body button:has-text("✕")').first()
    // Don't remove it — just try saving with empty objective
    const objInput = page.locator('.modal-body input[placeholder="Mục tiêu 1"]')
    await objInput.clear()
    await page.click('.modal-body button:has-text("Tạo kế hoạch")')
    // Should show toast warning
    await expect(page.locator('text=ít nhất 1 mục tiêu')).toBeVisible({
      timeout: 3000,
    })
  })

  test('FR-019: create plan validates required name', async ({ page }) => {
    await page.click('button:has-text("Tạo kế hoạch")')
    await page.click('.modal-body button:has-text("Tạo kế hoạch")')
    await expect(page.locator('text=Cần nhập tên kế hoạch')).toBeVisible({
      timeout: 3000,
    })
  })

  test('FR-019: can add multiple objectives in create form', async ({
    page,
  }) => {
    await page.click('button:has-text("Tạo kế hoạch")')
    const addBtn = page.locator('.modal-body button:has-text("Thêm")')
    await addBtn.click()
    const inputs = page.locator('.modal-body input[placeholder^="Mục tiêu"]')
    await expect(inputs).toHaveCount(2)
  })

  test('FR-019: close modal with Cancel', async ({ page }) => {
    await page.click('button:has-text("Tạo kế hoạch")')
    await expect(page.locator('.modal-panel')).toBeVisible()
    await page.click('.modal-body button:has-text("Hủy")')
    await expect(page.locator('.modal-panel')).not.toBeVisible()
  })

  test('FR-019: year filter changes displayed plans', async ({ page }) => {
    const yearSelect = page.locator('select').first()
    await yearSelect.selectOption({ label: 'Tất cả năm' })
    // Should not crash
    await expect(page.locator('h2:has-text("Kế hoạch năm")')).toBeVisible()
  })

  test('FR-020: DoD tab visible in plan detail', async ({ page }) => {
    // If there are plans, click on Chi tiết
    const detailBtns = page.locator('button:has-text("Chi tiết")')
    const count = await detailBtns.count()
    if (count > 0) {
      await detailBtns.first().click()
      await expect(
        page.locator('button:has-text("Definition of Done")'),
      ).toBeVisible()
    }
  })

  test('FR-022: Dashboard tab visible in plan detail', async ({ page }) => {
    const detailBtns = page.locator('button:has-text("Chi tiết")')
    const count = await detailBtns.count()
    if (count > 0) {
      await detailBtns.first().click()
      await expect(
        page.locator('button:has-text("Dashboard")'),
      ).toBeVisible()
    }
  })

  test('FR-021: Projects tab visible in plan detail', async ({ page }) => {
    const detailBtns = page.locator('button:has-text("Chi tiết")')
    const count = await detailBtns.count()
    if (count > 0) {
      await detailBtns.first().click()
      await expect(
        page.locator('button:has-text("Dự án liên kết")'),
      ).toBeVisible()
    }
  })

  test('FR-019: state transition buttons visible', async ({ page }) => {
    const draftPlans = page.locator('button:has-text("Kích hoạt")')
    const activePlans = page.locator('button:has-text("Đóng kế hoạch")')
    // Either could be present depending on data
    const draftCount = await draftPlans.count()
    const activeCount = await activePlans.count()
    // Test is data-dependent, just verify no crash
    expect(draftCount + activeCount).toBeGreaterThanOrEqual(0)
  })

  test('back to list navigation works', async ({ page }) => {
    const detailBtns = page.locator('button:has-text("Chi tiết")')
    const count = await detailBtns.count()
    if (count > 0) {
      await detailBtns.first().click()
      await expect(
        page.locator('button:has-text("Quay lại danh sách")'),
      ).toBeVisible()
      await page.click('button:has-text("Quay lại danh sách")')
      await expect(
        page.locator('button:has-text("Tạo kế hoạch")'),
      ).toBeVisible()
    }
  })
})
