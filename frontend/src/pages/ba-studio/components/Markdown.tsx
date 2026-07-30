/**
 * Renderer Markdown tối giản cho BA Studio — dựng THẲNG ra React element,
 * không dùng dangerouslySetInnerHTML và không thêm dependency mới.
 *
 * Vì sao tự viết: tài liệu BRS/FSD là dữ liệu nội bộ ngân hàng, việc chèn HTML
 * thô từ nội dung tài liệu vào DOM là rủi ro không cần thiết. Ở đây HTML thô
 * trong Markdown được hiển thị NHƯ VĂN BẢN, mọi liên kết bị giới hạn scheme.
 *
 * Cú pháp hỗ trợ (đủ cho tài liệu nghiệp vụ):
 *   #..###### heading · đoạn văn · **đậm** *nghiêng* ~~gạch~~ `mã`
 *   danh sách - * + và 1. (lồng theo thụt lề) · > trích dẫn
 *   bảng GFM (| --- | :---: |) · khối code ``` ~~~ · đường kẻ ---
 *   [nhãn](https://…) — chỉ http/https/mailto/#/đường dẫn nội bộ
 */
import React from 'react'

// ── Inline ──────────────────────────────────────────────────────────────────

const INLINE = new RegExp([
  '(`+)([\\s\\S]+?)\\1',                    // 1,2  mã
  '\\*\\*([\\s\\S]+?)\\*\\*',               // 3    **đậm**
  '__([\\s\\S]+?)__',                       // 4    __đậm__
  '~~([\\s\\S]+?)~~',                       // 5    ~~gạch ngang~~
  '\\*([^*\\n]+?)\\*',                      // 6    *nghiêng*
  '_([^_\\n]+?)_',                          // 7    _nghiêng_
  '\\[([^\\]]*)\\]\\(([^)\\s]+)[^)]*\\)',   // 8,9  [nhãn](url)
].join('|'), 'g')

const SAFE_URL = /^(?:https?:\/\/|mailto:|#|\/)/i

const CODE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '.92em', padding: '1px 4px', borderRadius: 3,
  background: 'var(--vib-neutral-100)', border: '1px solid var(--vib-neutral-200)',
  wordBreak: 'break-word',
}

export function inlineMarkdown(text: string, keyBase = 'i'): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let last = 0
  let n = 0
  const re = new RegExp(INLINE.source, 'g')
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${keyBase}-${n++}`
    if (m[2] !== undefined) {
      out.push(<code key={key} style={CODE_STYLE}>{m[2]}</code>)
    } else if (m[3] !== undefined || m[4] !== undefined) {
      out.push(<strong key={key}>{inlineMarkdown(m[3] ?? m[4], key)}</strong>)
    } else if (m[5] !== undefined) {
      out.push(<del key={key} style={{ color: 'var(--vib-neutral-500)' }}>{inlineMarkdown(m[5], key)}</del>)
    } else if (m[6] !== undefined || m[7] !== undefined) {
      out.push(<em key={key}>{inlineMarkdown(m[6] ?? m[7], key)}</em>)
    } else if (m[9] !== undefined) {
      const label = m[8] || m[9]
      out.push(SAFE_URL.test(m[9])
        ? (
          <a key={key} href={m[9]} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--vib-primary)' }}>{inlineMarkdown(label, key)}</a>
        )
        : <React.Fragment key={key}>{m[0]}</React.Fragment>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Nối các dòng của một đoạn, '  ' cuối dòng = ngắt dòng cứng */
function paragraphNodes(lines: string[], key: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  lines.forEach((line, i) => {
    out.push(...inlineMarkdown(line.replace(/[ \t]+$/, ''), `${key}-l${i}`))
    if (i < lines.length - 1) out.push(<br key={`${key}-br${i}`} />)
  })
  return out
}

// ── Block ───────────────────────────────────────────────────────────────────

const H_STYLE: Record<number, React.CSSProperties> = {
  1: { fontSize: 21, fontWeight: 700, margin: '18px 0 10px', lineHeight: 1.3 },
  2: { fontSize: 17, fontWeight: 700, margin: '16px 0 8px', lineHeight: 1.35 },
  3: { fontSize: 15, fontWeight: 600, margin: '14px 0 6px', lineHeight: 1.4 },
  4: { fontSize: 14, fontWeight: 600, margin: '12px 0 6px' },
  5: { fontSize: 13, fontWeight: 600, margin: '10px 0 4px' },
  6: { fontSize: 13, fontWeight: 600, margin: '10px 0 4px', color: 'var(--vib-neutral-600)' },
}

const RE_HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/
const RE_FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/
const RE_HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const RE_UL = /^([ \t]*)([-*+])[ \t]+(.*)$/
const RE_OL = /^([ \t]*)(\d+)[.)][ \t]+(.*)$/
const RE_QUOTE = /^ {0,3}>[ \t]?(.*)$/
const RE_TABLE_SPLIT = /^[ \t]*\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?[ \t]*$/

function indentWidth(prefix: string): number {
  let w = 0
  for (const ch of prefix) w += ch === '\t' ? 4 : 1
  return w
}

function cells(row: string): string[] {
  let line = row.trim()
  if (line.startsWith('|')) line = line.slice(1)
  if (line.endsWith('|') && !line.endsWith('\\|')) line = line.slice(0, -1)
  return line.split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim())
}

interface ListItem { text: string[]; indent: number; children: ListNode[] }
interface ListNode { ordered: boolean; items: ListItem[] }

/** Gom các dòng danh sách liên tiếp thành cây theo thụt lề */
function buildList(lines: string[], start: number): { node: ListNode; next: number } {
  const first = RE_UL.exec(lines[start]) ?? RE_OL.exec(lines[start])
  const ordered = !RE_UL.test(lines[start])
  const baseIndent = indentWidth(first![1])
  const node: ListNode = { ordered, items: [] }
  let i = start

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') {
      const nextLine = lines[i + 1] ?? ''
      if (!(RE_UL.test(nextLine) || RE_OL.test(nextLine))) break
      i++
      continue
    }
    const m = RE_UL.exec(line) ?? RE_OL.exec(line)
    if (!m) {
      // dòng tiếp nối của item hiện tại (thụt vào)
      if (node.items.length && indentWidth(line.match(/^[ \t]*/)![0]) > baseIndent) {
        node.items[node.items.length - 1].text.push(line.trim())
        i++
        continue
      }
      break
    }
    const indent = indentWidth(m[1])
    if (indent > baseIndent) {
      const sub = buildList(lines, i)
      if (node.items.length) node.items[node.items.length - 1].children.push(sub.node)
      else node.items.push({ text: [], indent, children: [sub.node] })
      i = sub.next
      continue
    }
    if (indent < baseIndent) break
    const isOrdered = !RE_UL.test(line)
    if (isOrdered !== ordered) break
    node.items.push({ text: [m[3]], indent, children: [] })
    i++
  }
  return { node, next: i }
}

function renderList(node: ListNode, key: string): React.ReactNode {
  const Tag = node.ordered ? 'ol' : 'ul'
  return (
    <Tag key={key} style={{ margin: '6px 0 6px 0', paddingLeft: 22 }}>
      {node.items.map((item, i) => (
        <li key={`${key}-${i}`} style={{ margin: '3px 0', lineHeight: 1.65 }}>
          {paragraphNodes(item.text, `${key}-${i}`)}
          {item.children.map((child, ci) => renderList(child, `${key}-${i}-c${ci}`))}
        </li>
      ))}
    </Tag>
  )
}

function renderBlocks(md: string, keyBase: string): React.ReactNode[] {
  const lines = (md ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const out: React.ReactNode[] = []
  let i = 0
  let n = 0
  const nextKey = () => `${keyBase}-b${n++}`

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') { i++; continue }

    // khối code
    const fence = RE_FENCE.exec(line)
    if (fence) {
      const marker = fence[1]
      const lang = (fence[2] ?? '').trim()
      const body: string[] = []
      i++
      while (i < lines.length) {
        const close = RE_FENCE.exec(lines[i])
        if (close && close[1][0] === marker[0] && close[1].length >= marker.length
          && !(close[2] ?? '').trim()) { i++; break }
        body.push(lines[i])
        i++
      }
      out.push(
        <pre key={nextKey()} style={{
          margin: '10px 0', padding: '10px 12px', borderRadius: 6, overflowX: 'auto',
          background: 'var(--vib-neutral-50)', border: '1px solid var(--vib-neutral-200)',
          fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.55,
        }}>
          {lang && (
            <div style={{ fontSize: 11, color: 'var(--vib-neutral-400)', marginBottom: 4 }}>{lang}</div>
          )}
          <code>{body.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // heading
    const h = RE_HEADING.exec(line)
    if (h && h[2]) {
      const level = h[1].length
      const Tag = `h${level}` as 'h1'
      out.push(<Tag key={nextKey()} style={H_STYLE[level]}>{inlineMarkdown(h[2], nextKey())}</Tag>)
      i++
      continue
    }

    // đường kẻ
    if (RE_HR.test(line)) {
      out.push(<hr key={nextKey()} style={{
        border: 'none', borderTop: '1px solid var(--vib-neutral-200)', margin: '14px 0',
      }} />)
      i++
      continue
    }

    // bảng GFM: dòng header + dòng phân cách
    if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SPLIT.test(lines[i + 1])) {
      const header = cells(line)
      const aligns = cells(lines[i + 1]).map(c => {
        const l = c.startsWith(':')
        const r = c.endsWith(':')
        return r && l ? 'center' : r ? 'right' : 'left'
      })
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(cells(lines[i]))
        i++
      }
      const key = nextKey()
      out.push(
        <div key={key} style={{ overflowX: 'auto', margin: '10px 0' }}>
          <table style={{
            borderCollapse: 'collapse', width: '100%', fontSize: 13,
            border: '1px solid var(--vib-neutral-200)',
          }}>
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th key={ci} style={{
                    padding: '7px 10px', textAlign: (aligns[ci] ?? 'left') as 'left',
                    background: 'var(--vib-neutral-50)', fontWeight: 600,
                    border: '1px solid var(--vib-neutral-200)', whiteSpace: 'nowrap',
                  }}>{inlineMarkdown(c, `${key}-h${ci}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {header.map((_, ci) => (
                    <td key={ci} style={{
                      padding: '7px 10px', textAlign: (aligns[ci] ?? 'left') as 'left',
                      border: '1px solid var(--vib-neutral-200)', verticalAlign: 'top',
                    }}>{inlineMarkdown(row[ci] ?? '', `${key}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // trích dẫn
    if (RE_QUOTE.test(line)) {
      const body: string[] = []
      while (i < lines.length) {
        const q = RE_QUOTE.exec(lines[i])
        if (!q) break
        body.push(q[1])
        i++
      }
      out.push(
        <blockquote key={nextKey()} style={{
          margin: '10px 0', padding: '2px 0 2px 12px',
          borderLeft: '3px solid var(--vib-neutral-300)', color: 'var(--vib-neutral-600)',
        }}>
          {renderBlocks(body.join('\n'), nextKey())}
        </blockquote>,
      )
      continue
    }

    // danh sách
    if (RE_UL.test(line) || RE_OL.test(line)) {
      const { node, next } = buildList(lines, i)
      out.push(renderList(node, nextKey()))
      i = next
      continue
    }

    // đoạn văn
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== ''
      && !RE_HEADING.test(lines[i]) && !RE_FENCE.test(lines[i]) && !RE_HR.test(lines[i])
      && !RE_UL.test(lines[i]) && !RE_OL.test(lines[i]) && !RE_QUOTE.test(lines[i])
      && !(lines[i].includes('|') && RE_TABLE_SPLIT.test(lines[i + 1] ?? ''))) {
      para.push(lines[i])
      i++
    }
    if (para.length) {
      const key = nextKey()
      out.push(
        <p key={key} style={{ margin: '8px 0', lineHeight: 1.7 }}>
          {paragraphNodes(para, key)}
        </p>,
      )
    } else {
      i++
    }
  }

  return out
}

/** Hiển thị một chuỗi Markdown thành nội dung tài liệu đọc được */
export function Markdown({ text, style }: { text: string; style?: React.CSSProperties }) {
  const nodes = React.useMemo(() => renderBlocks(text ?? '', 'md'), [text])
  return (
    <div
      data-testid="markdown-body"
      style={{
        fontSize: 13.5, color: 'var(--vib-neutral-800)', wordBreak: 'break-word', ...style,
      }}
    >
      {nodes}
    </div>
  )
}
