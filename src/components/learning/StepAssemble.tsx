import { useMemo } from 'react'
import { useLearningStore } from '../../store/learningStore'
import OriginalCard from './primitives/OriginalCard'

// Stable shuffle using the block ids as seed so each mount renders the same shuffle
function stableShuffle<T extends { id: string }>(arr: T[]): T[] {
  const out = [...arr]
  let seed = out.reduce((acc, x) => acc + x.id.charCodeAt(0), 0)
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280
    const j = Math.floor((seed / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export default function StepAssemble() {
  const {
    payload,
    originalKorean,
    blockOrder,
    connectorChoice,
    tapBlock,
    resetBlockOrder,
    tapConnector,
    advanceToStep2,
  } = useLearningStore()

  const shuffledBlocks = useMemo(
    () => (payload ? stableShuffle(payload.assembly.blocks) : []),
    [payload],
  )

  const previewText = useMemo(() => {
    if (!payload) return ''
    if (blockOrder.length === 0) return '블록을 눌러서 문장을 만들어봐'
    const byId = new Map(payload.assembly.blocks.map((b) => [b.id, b.en]))
    const parts = blockOrder.map((id) => byId.get(id) ?? '')
    if (connectorChoice && blockOrder.length >= 2) {
      const conn = payload.assembly.connectors.find((c) => c.id === connectorChoice)?.label ?? ''
      return `${parts[0]}, ${conn} ${parts.slice(1).join(' ')}`
    }
    return parts.join(' · ')
  }, [blockOrder, connectorChoice, payload])

  if (!payload) return null

  const blocksComplete = blockOrder.length === 3
  const canAdvance = blocksComplete && connectorChoice !== null

  return (
    <div className="space-y-6 fu">
      <OriginalCard korean={originalKorean} compact />

      <div className="fu1">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
          이제 블록을 눌러서 문장을 만들어봐
        </p>
        <div className="flex flex-col gap-1.5">
          {shuffledBlocks.map((block) => {
            const pos = blockOrder.indexOf(block.id)
            const selected = pos >= 0
            return (
              <button
                key={block.id}
                onClick={() => tapBlock(block.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-[14px] border-[1.5px] transition-all text-left ${
                  selected ? 'border-accent bg-accent/[0.06]' : 'border-line bg-c'
                }`}
              >
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-c2 text-[11px] font-bold font-en text-t3">
                  {selected ? pos + 1 : ''}
                </span>
                <p className="flex-1 text-[14px] font-medium font-en text-t2">{block.en}</p>
              </button>
            )
          })}
        </div>
        {blockOrder.length > 0 && !blocksComplete && (
          <button
            onClick={resetBlockOrder}
            className="mt-2 text-[12px] text-t3 hover:text-accent transition"
          >
            초기화
          </button>
        )}
      </div>

      {blocksComplete && (
        <div className="fu2">
          <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
            연결어를 선택해봐
          </p>
          <div className="flex flex-col gap-1.5">
            {payload.assembly.connectors.map((conn) => {
              const selected = connectorChoice === conn.id
              return (
                <button
                  key={conn.id}
                  onClick={() => tapConnector(conn.id)}
                  className={`px-4 py-3 rounded-[14px] border-[1.5px] text-left transition-all ${
                    selected ? 'border-accent bg-accent/[0.06]' : 'border-line bg-c'
                  }`}
                >
                  <p className="text-[14px] font-semibold font-en text-t1 mb-1">{conn.label}</p>
                  <p className="text-[11px] text-t3">{conn.meaning}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="fu3 p-[18px] bg-c rounded-[16px] border border-line">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-2">
          Preview
        </p>
        <p className="text-[13px] text-t2 leading-relaxed font-en mb-2">{previewText}</p>
        <p className="text-[11px] text-t3 font-en">
          선택됨: <span className="tabular-nums">{blockOrder.length}/3</span>
          {connectorChoice && ` · ${connectorChoice}`}
        </p>
      </div>

      <button
        onClick={advanceToStep2}
        disabled={!canAdvance}
        className={`pressable w-full h-[52px] rounded-[14px] text-[15px] font-semibold transition-all ${
          canAdvance
            ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.25)]'
            : 'bg-c2 text-t3 cursor-default'
        }`}
      >
        문장 검토하기
      </button>
    </div>
  )
}
