import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Markdown } from '../components/Markdown'

describe('Markdown', () => {
  it('render heading đúng cấp', () => {
    render(<Markdown text={'# H1\n\n## H2\n\n### H3'} />)
    expect(screen.getByRole('heading', { level: 1, name: 'H1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'H2' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'H3' })).toBeInTheDocument()
  })

  it('render danh sách không thứ tự và có thứ tự', () => {
    const { container } = render(<Markdown text={'- một\n- hai\n\n1. ba\n2. bốn'} />)
    expect(container.querySelectorAll('ul li')).toHaveLength(2)
    expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(screen.getByText('một')).toBeInTheDocument()
  })

  it('render danh sách lồng nhau', () => {
    const { container } = render(<Markdown text={'- cha\n  - con\n  - con 2'} />)
    expect(container.querySelectorAll('ul ul li')).toHaveLength(2)
  })

  it('render bảng GFM với căn lề', () => {
    const md = ['| Mã | Tên | Số |', '| :-- | :-: | --: |', '| FR-1 | Tạo | 3 |'].join('\n')
    const { container } = render(<Markdown text={md} />)
    expect(container.querySelectorAll('thead th')).toHaveLength(3)
    expect(container.querySelectorAll('tbody td')).toHaveLength(3)
    expect(screen.getByText('FR-1')).toBeInTheDocument()
    const ths = container.querySelectorAll('thead th')
    expect((ths[1] as HTMLElement).style.textAlign).toBe('center')
    expect((ths[2] as HTMLElement).style.textAlign).toBe('right')
  })

  it('render khối code, giữ nguyên nội dung bên trong', () => {
    const { container } = render(<Markdown text={'```sql\nSELECT 1;\n-- # không phải heading\n```'} />)
    const code = container.querySelector('pre code')
    expect(code?.textContent).toBe('SELECT 1;\n-- # không phải heading')
    expect(container.querySelector('h1')).toBeNull()
  })

  it('render đậm, nghiêng, gạch ngang, mã inline', () => {
    const { container } = render(
      <Markdown text={'**đậm** *nghiêng* ~~gạch~~ `mã`'} />,
    )
    expect(container.querySelector('strong')?.textContent).toBe('đậm')
    expect(container.querySelector('em')?.textContent).toBe('nghiêng')
    expect(container.querySelector('del')?.textContent).toBe('gạch')
    expect(container.querySelector('code')?.textContent).toBe('mã')
  })

  it('render trích dẫn và đường kẻ', () => {
    const { container } = render(<Markdown text={'> lưu ý quan trọng\n\n---'} />)
    expect(container.querySelector('blockquote')?.textContent).toContain('lưu ý quan trọng')
    expect(container.querySelector('hr')).toBeInTheDocument()
  })

  it('liên kết http mở tab mới, có rel an toàn', () => {
    const { container } = render(<Markdown text={'[VIB](https://vib.com.vn)'} />)
    const a = container.querySelector('a')
    expect(a?.getAttribute('href')).toBe('https://vib.com.vn')
    expect(a?.getAttribute('target')).toBe('_blank')
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('liên kết scheme lạ (javascript:) KHÔNG thành thẻ a', () => {
    const { container } = render(<Markdown text={'[bấm](javascript:alert(1))'} />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('[bấm](javascript:alert(1))')
  })

  it('HTML thô trong Markdown hiển thị như văn bản, không chèn vào DOM', () => {
    const { container } = render(<Markdown text={'<script>alert(1)</script><b>bold?</b>'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })

  it('văn bản rỗng → không lỗi', () => {
    const { container } = render(<Markdown text="" />)
    expect(container.querySelector('[data-testid="markdown-body"]')).toBeInTheDocument()
  })

  it('đoạn văn nhiều dòng gộp thành một thẻ p có br', () => {
    const { container } = render(<Markdown text={'dòng một\ndòng hai'} />)
    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(container.querySelectorAll('p br')).toHaveLength(1)
  })
})
