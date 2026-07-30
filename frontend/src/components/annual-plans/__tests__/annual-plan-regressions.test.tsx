/**
 * Test hồi quy cho 3 lỗi thật của module Kế hoạch năm (2026-07-30):
 *
 *  1. Tab Dashboard gọi /reports/... thiếu /api/v1 → 404 "Not Found"
 *  2. Lỗi 404 đó kích hoạt vòng lặp gọi API vô hạn (đo được 361 request/tab):
 *     onError là arrow inline → mỗi render là hàm mới → load mới → useEffect chạy lại
 *  3. Cột NUMERIC về dạng chuỗi ("40.00") làm reduce() nối chuỗi → hiển thị "NaN%"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { computeCompletion, num } from '../DodItemList'
import { AnnualPlanDashboard } from '../AnnualPlanDashboard'
import { getAnnualPlanSummary } from '../../../lib/api/annual-plans'
import type { DodItem } from '../../../lib/types/annual-plan'

/** Dựng một DodItem với weight kiểu bất kỳ (mô phỏng payload thật từ API). */
function dod(weight: unknown, achieved: boolean): DodItem {
  return {
    id: `dod-${String(weight)}-${achieved}`,
    plan_id: 'plan-001',
    criterion: 'x',
    weight: weight as number,
    is_achieved: achieved,
  }
}

describe('num()', () => {
  it('đổi chuỗi số thành số, chặn giá trị không hợp lệ về 0', () => {
    expect(num('40.00')).toBe(40)
    expect(num(40)).toBe(40)
    expect(num(null)).toBe(0)
    expect(num(undefined)).toBe(0)
    expect(num('abc')).toBe(0)
    expect(num(NaN)).toBe(0)
    expect(num(Infinity)).toBe(0)
  })
})

describe('computeCompletion — lỗi NaN% khi weight là chuỗi', () => {
  it('weight dạng chuỗi vẫn ra đúng phần trăm (trước đây ra NaN)', () => {
    const items = [
      dod('40.00', false),
      dod('30.00', false),
      dod('20.00', false),
      dod('10.00', true),
    ]
    const pct = computeCompletion(items)
    expect(Number.isNaN(pct)).toBe(false)
    expect(pct).toBeCloseTo(10, 5) // 10 / (40+30+20+10)
  })

  it('weight dạng số vẫn đúng như cũ', () => {
    expect(computeCompletion([dod(50, true), dod(50, false)])).toBe(50)
    expect(computeCompletion([dod(30, true), dod(70, true)])).toBe(100)
  })

  it('danh sách rỗng hoặc tổng trọng số 0 thì trả 0, không chia cho 0', () => {
    expect(computeCompletion([])).toBe(0)
    expect(computeCompletion([dod(0, true), dod(0, false)])).toBe(0)
    expect(computeCompletion([dod('x', true)])).toBe(0)
  })

  it('hiển thị ra "NaN%" nếu quay lại cách cộng cũ — chốt lại kỳ vọng', () => {
    // Đây chính là biểu thức cũ: acc + i.weight (không đổi kiểu)
    const cu = [dod('40.00', false), dod('30.00', false)]
      .reduce((acc: number, i) => acc + (i.weight as unknown as number), 0)
    expect(Number.isNaN(Number(cu))).toBe(true) // "040.0030.00" -> NaN
    // còn cách mới thì không
    expect(Number.isNaN(computeCompletion(cu ? [dod('40.00', false)] : []))).toBe(false)
  })
})

describe('getAnnualPlanSummary — URL phải mang /api/v1', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.setItem('access_token', 'tok')
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: null }),
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('gọi đúng /api/ppg/api/v1/reports/annual-plan-summary/{id}', async () => {
    await getAnnualPlanSummary('plan-001')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toBe('/api/ppg/api/v1/reports/annual-plan-summary/plan-001')
    expect(url).toContain('/api/v1/reports/')
  })
})

describe('AnnualPlanDashboard — không được gọi API lặp vô hạn', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.setItem('access_token', 'tok')
    // API lỗi: đúng tình huống đã sinh ra vòng lặp
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Not Found' }),
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('chỉ gọi 1 lần dù onError là hàm mới ở mỗi lần render', async () => {
    const { rerender } = render(
      <AnnualPlanDashboard planId="plan-001" onError={(m) => void m} />,
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    // cha re-render 5 lần, mỗi lần truyền một arrow MỚI (đúng như AnnualPlansPage)
    for (let k = 0; k < 5; k++) {
      rerender(<AnnualPlanDashboard planId="plan-001" onError={(m) => void m} />)
    }
    await new Promise((r) => setTimeout(r, 50))

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('gọi lại khi đổi sang kế hoạch khác', async () => {
    const { rerender } = render(
      <AnnualPlanDashboard planId="plan-001" onError={() => {}} />,
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    rerender(<AnnualPlanDashboard planId="plan-002" onError={() => {}} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(String(fetchMock.mock.calls[1][0])).toContain('plan-002')
  })

  it('báo lỗi ra ngoài và hiện trạng thái rỗng thay vì màn hình trắng', async () => {
    const onError = vi.fn()
    render(<AnnualPlanDashboard planId="plan-001" onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Not Found'))
    expect(screen.getByText('Không có dữ liệu dashboard')).toBeInTheDocument()
  })
})

describe('AnnualPlanDashboard — payload có null không được làm vỡ tab', () => {
  /** Lỗi thật: dự án chưa có báo cáo test → test_coverage_pct = null → null.toFixed() nổ. */
  const payload = {
    data: {
      plan: { id: 'plan-001', name: 'Kế hoạch IT năm 2026', year: 2026, status: 'active' },
      dod_completion_pct: 10,
      projects_by_status: { active: 2, on_hold: 0, completed: 1, archived: 0 },
      projects: [
        {
          id: 'p1', name: 'eHR 2.0', status: 'active',
          milestone_progress: '1/3', ba_docs_approved: 2,
          test_coverage_pct: null,
        },
        {
          id: 'p2', name: 'FinnFlow', status: 'completed',
          milestone_progress: '3/3', ba_docs_approved: 5,
          test_coverage_pct: 92.5,
        },
      ],
    },
  }

  beforeEach(() => {
    sessionStorage.setItem('access_token', 'tok')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => payload,
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('render được, coverage null hiện 0% chứ không nổ', async () => {
    const onError = vi.fn()
    render(<AnnualPlanDashboard planId="plan-001" onError={onError} />)

    await waitFor(() => expect(screen.getByText('eHR 2.0')).toBeInTheDocument())
    expect(onError).not.toHaveBeenCalled()
    expect(screen.getByText('0%')).toBeInTheDocument()   // dự án chưa có báo cáo test
    expect(screen.getByText('93%')).toBeInTheDocument()  // 92.5 làm tròn
    expect(screen.getByText('10.0%')).toBeInTheDocument() // tiến độ DoD
    expect(screen.getByText('FinnFlow')).toBeInTheDocument()
  })
})
