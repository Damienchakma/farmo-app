import {
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  Droplets,
  FlaskConical,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FarmoMark } from '@/components/brand/brand'
import { Button, Textarea } from '@/components/ui/controls'
import { SeverityStamp, Stamp } from '@/components/ui/data'
import { Divider, Panel, PanelBody, PanelHead, SectionHead } from '@/components/ui/surfaces'
import { useCopyToClipboard } from '@/lib/hooks'
import { formatArea, formatNumber, relativeTime, titleCase } from '@/lib/format'
import {
  answerQuestion,
  buildBrief,
  suggestedPrompts,
  type AssistantAction,
  type AssistantPrompt,
  type AssistantReply,
} from '@/lib/assistant'
import type { FarmBundle } from '@/mock/types'
import { useFarm } from '@/store/farm'
import { useSession } from '@/store/session'

type UserMessage = { id: string; role: 'user'; text: string }
type AssistantMessage = { id: string; role: 'assistant' } & AssistantReply
type ChatMessage = UserMessage | AssistantMessage

const STORAGE_PREFIX = 'farmo.assistant.'
const THINKING_STEPS = ['Reading the farm record…', 'Checking the advice ledger…', 'Cross-checking the risk register…']

const PROMPT_ICONS: Record<string, typeof Sparkles> = {
  priorities: Sparkles,
  water: Droplets,
  soil: FlaskConical,
  risk: TriangleAlert,
}

let messageSeq = 0
function nextMessageId(): string {
  messageSeq += 1
  return `msg-${Date.now()}-${messageSeq}`
}

function briefMessage(bundle: FarmBundle): AssistantMessage {
  return { id: 'brief', role: 'assistant', ...buildBrief(bundle) }
}

function readConversation(bundle: FarmBundle): ChatMessage[] | null {
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${bundle.farm.id}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { computedAt?: string; messages?: ChatMessage[] }
    if (parsed.computedAt !== bundle.analysis.computedAt || !Array.isArray(parsed.messages) || !parsed.messages.length) {
      return null
    }
    return parsed.messages
  } catch {
    return null
  }
}

function plainText(message: AssistantMessage): string {
  return [
    message.text.replace(/\*\*/g, ''),
    ...(message.bullets ?? []).map((bullet) => `• ${bullet.replace(/\*\*/g, '')}`),
    message.why ? `Why: ${message.why}` : '',
    `Sources: ${message.sources.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/* ================================================================ the tab */

export function AssistantTab() {
  const bundle = useFarm((s) => s.bundle)
  if (!bundle) return null
  // A new analysis means the stored answer can be stale; remount on change.
  return <AssistantWorkspace key={`${bundle.farm.id}:${bundle.analysis.computedAt}`} bundle={bundle} />
}

function AssistantWorkspace({ bundle }: { bundle: FarmBundle }) {
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const [messages, setMessages] = useState<ChatMessage[]>(() => readConversation(bundle) ?? [briefMessage(bundle)])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [thinking, setThinking] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<number | null>(null)

  const prompts = useMemo(() => suggestedPrompts(bundle), [bundle])
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant')

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        `${STORAGE_PREFIX}${bundle.farm.id}`,
        JSON.stringify({ computedAt: bundle.analysis.computedAt, messages }),
      )
    } catch {
      /* private mode: the conversation still works for this mount */
    }
  }, [bundle.farm.id, bundle.analysis.computedAt, messages])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (messages.length <= 1 && !pending) {
      el.scrollTo({ top: 0 })
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  useEffect(() => {
    if (!pending) return
    const id = window.setInterval(() => setThinking((step) => (step + 1) % THINKING_STEPS.length), 720)
    return () => window.clearInterval(id)
  }, [pending])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [draft])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const ask = (question: string) => {
    const q = question.trim()
    if (!q || pending) return

    setMessages((current) => [...current, { id: nextMessageId(), role: 'user', text: q }])
    setDraft('')
    setThinking(0)
    setPending(true)

    const delay = 520 + Math.min(900, q.length * 7)
    timer.current = window.setTimeout(() => {
      const reply = answerQuestion(q, bundle)
      setMessages((current) => [...current, { id: nextMessageId(), role: 'assistant', ...reply }])
      setPending(false)
      timer.current = null
    }, delay)
  }

  const reset = () => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setMessages([briefMessage(bundle)])
    setDraft('')
    setPending(false)
    textareaRef.current?.focus()
  }

  const go = (action: AssistantAction) => navigate(`/farms/${bundle.farm.id}/${action.tab}`)
  const showPrompts = !pending && messages.length === 1 && messages[0]?.role === 'assistant'

  return (
    <div className="space-y-5">
      <SectionHead
        eyebrow="Farmo assistant"
        title="Ask the field."
        description="A second pair of eyes on this farm's record. Ask about water, nutrients, risk or the next rotation — every answer is assembled from the advice and risk ledgers, with the numbers and sources attached."
        actions={
          <>
            <Stamp tone="green">grounded in this farm</Stamp>
            <Stamp tone="plain" className="border-line-strong">
              no external model
            </Stamp>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,302px)]">
        <Panel className="flex h-[620px] flex-col lg:h-[660px]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="relative grid h-9 w-9 flex-none place-items-center rounded-sm border border-line bg-paper-raised">
                <FarmoMark size={26} />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-paper-raised bg-green-600" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">Field assistant</p>
                <p className="truncate text-[11px] text-ink-3">
                  Reading {bundle.farm.name} · updated {relativeTime(bundle.analysis.computedAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-none items-center gap-1.5">
              <Stamp tone="green" className="hidden sm:inline-flex">
                grounded
              </Stamp>
              <Button
                size="sm"
                variant="quiet"
                icon={<RotateCcw />}
                onClick={reset}
                aria-label="Start a new conversation"
                title="Start a new conversation"
              />
            </div>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={pending}
            aria-label="Assistant conversation"
          >
            <div className="space-y-6">
              {messages.map((message) =>
                message.role === 'user' ? (
                  <UserBubble key={message.id} message={message} initials={user?.initials ?? 'ME'} />
                ) : (
                  <AssistantNote
                    key={message.id}
                    message={message}
                    latest={message.id === latestAssistant?.id}
                    onAction={go}
                    onFollowUp={ask}
                  />
                ),
              )}

              {showPrompts && <PromptCards prompts={prompts} onAsk={ask} />}
              {pending && <ThinkingIndicator step={thinking} />}
            </div>
          </div>

          <div className="border-t border-line bg-paper-sunken/55 p-3">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                ask(draft)
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    ask(draft)
                  }
                }}
                placeholder="Ask about water, nutrients, risk, rotation…"
                className="max-h-[132px] min-h-[42px] flex-1 resize-none py-2.5"
                aria-label="Ask the field assistant"
                disabled={pending}
              />
              <Button
                type="submit"
                variant="primary"
                className="h-[42px]"
                icon={<ArrowUp size={16} />}
                aria-label="Send question"
                disabled={!draft.trim() || pending}
              />
            </form>
            <div className="mt-1.5 flex items-center justify-between gap-3 px-0.5 text-[10px] text-ink-3">
              <span>Answers read this farm's record; no external model is called.</span>
              <span className="hidden flex-none sm:inline">Enter to send · Shift+Enter for a new line</span>
            </div>
          </div>
        </Panel>

        <ContextRail bundle={bundle} />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- messages */

function UserBubble({ message, initials }: { message: UserMessage; initials: string }) {
  return (
    <div className="fade-up flex justify-end gap-2.5">
      <div className="max-w-[86%] rounded-sm border border-green-700/15 bg-green-100/70 px-3.5 py-2.5 text-sm leading-relaxed text-ink">
        {message.text}
      </div>
      <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-green-600 text-[10px] font-semibold tracking-wide text-paper-raised">
        {initials}
      </span>
    </div>
  )
}

function AssistantNote({
  message,
  latest,
  onAction,
  onFollowUp,
}: {
  message: AssistantMessage
  latest: boolean
  onAction: (action: AssistantAction) => void
  onFollowUp: (question: string) => void
}) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <article className="fade-up flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-sm border border-line bg-paper-raised">
        <FarmoMark size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold text-ink">Farmo</span>
          <span className="text-[10px] uppercase tracking-[0.09em] text-ink-3">field assistant</span>
        </div>

        <div className="mt-1.5 max-w-[68ch] space-y-2 text-sm leading-relaxed text-ink-2">
          {message.text.split('\n\n').map((paragraph, index) => (
            <p key={index}>
              <RichText text={paragraph} />
            </p>
          ))}
          {message.bullets?.length ? (
            <ul className="mt-2 space-y-1.5">
              {message.bullets.map((bullet) => (
                <li key={bullet} className="relative pl-4">
                  <span className="absolute left-0.5 top-[0.62em] h-[5px] w-[5px] rounded-full bg-green-500" aria-hidden />
                  <RichText text={bullet} />
                </li>
              ))}
            </ul>
          ) : null}
          {message.why && (
            <p className="border-l-2 border-marigold-500 pl-3 text-xs leading-relaxed text-ink-2">
              <span className="eyebrow mb-0.5 block">Why</span>
              {message.why}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {message.sources.map((source) => (
            <Stamp key={source} tone="plain" className="border-line-strong">
              {source}
            </Stamp>
          ))}
          <button
            type="button"
            onClick={() => copy(plainText(message), message.id)}
            className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-paper-sunken hover:text-ink"
            aria-label={copied === message.id ? 'Answer copied' : 'Copy answer'}
            title={copied === message.id ? 'Copied' : 'Copy answer'}
          >
            {copied === message.id ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>

        {message.action && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            iconRight={<ArrowUpRight size={12} />}
            onClick={() => onAction(message.action!)}
          >
            {message.action.label}
          </Button>
        )}

        {latest && message.followUps?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.followUps.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onFollowUp(question)}
                className="rounded-full border border-line-strong bg-paper-raised px-2.5 py-1 text-[11px] text-ink-2 transition-colors hover:border-soil-300 hover:bg-paper-sunken hover:text-ink"
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function ThinkingIndicator({ step }: { step: number }) {
  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-sm border border-line bg-paper-raised">
        <FarmoMark size={22} />
      </span>
      <div className="flex items-center gap-2 pt-2">
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"
              style={{ animationDelay: `${index * 140}ms` }}
            />
          ))}
        </span>
        <span className="text-xs text-ink-3">{THINKING_STEPS[step % THINKING_STEPS.length]}</span>
      </div>
    </div>
  )
}

function PromptCards({ prompts, onAsk }: { prompts: AssistantPrompt[]; onAsk: (question: string) => void }) {
  return (
    <div className="fade-up ml-11 grid gap-2 sm:grid-cols-2">
      {prompts.map((prompt) => {
        const Icon = PROMPT_ICONS[prompt.id] ?? Sparkles
        return (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onAsk(prompt.question)}
            className="group flex items-start gap-2.5 rounded-sm border border-line bg-paper px-3 py-2.5 text-left transition-colors hover:border-soil-300 hover:bg-paper-sunken"
          >
            <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-sm bg-green-100 text-green-700">
              <Icon size={13} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-ink">{prompt.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">{prompt.description}</span>
            </span>
            <ArrowUpRight
              size={12}
              className="ml-auto mt-0.5 flex-none text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}

function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={index} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

/* ------------------------------------------------------------- context rail */

function ContextRail({ bundle }: { bundle: FarmBundle }) {
  const { farm, plants, analysis } = bundle
  const { conditions, charts, risk } = analysis
  const latest = [...bundle.operations].sort((a, b) => +new Date(b.at) - +new Date(a.at))[0]

  return (
    <aside className="space-y-4">
      <Panel>
        <PanelHead title="Reading now" meta={`${formatArea(farm.area)} · ${titleCase(farm.soilType)}`} />
        <PanelBody className="space-y-3.5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <MiniStat label="Fertility" value={`${conditions.fertilityIndex}`} note="/ 100" />
            <MiniStat label="Soil moisture" value={`${conditions.soilMoisture}%`} note="root zone" />
            <MiniStat label="Average pH" value={conditions.averagePh.toFixed(2)} note={conditions.averagePh < 5.9 ? 'acidic' : conditions.averagePh > 7.6 ? 'alkaline' : 'in range'} />
            <MiniStat
              label="Irrigation need"
              value={`${formatNumber(charts.water.irrigationNeedMm, 0)} mm`}
              note={`${formatNumber(conditions.rainfallNext7dMm, 1)} mm rain next 7 d`}
            />
          </dl>

          <Divider className="my-1" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="eyebrow">Plots in context</span>
              <span className="text-[11px] text-ink-3">{plants.length}</span>
            </div>
            {conditions.perPlant.length ? (
              <ul className="mt-2 space-y-1.5">
                {conditions.perPlant.slice(0, 4).map((row) => (
                  <li key={row.plantId} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate text-ink-2">{row.label}</span>
                    <span className="flex-none text-[10px] text-ink-3">{row.stage}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-ink-3">No plant records yet.</p>
            )}
          </div>

          <Divider className="my-1" />

          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow">Worst risk</span>
            {risk.items.length ? <SeverityStamp severity={risk.overall} /> : <Stamp tone="green">clear</Stamp>}
          </div>

          <p className="border-t border-line pt-2.5 text-[11px] leading-relaxed text-ink-3">
            {latest ? (
              <>
                Last change: <span className="text-ink-2">{latest.entityLabel}</span> · {latest.fieldLabel} {latest.before} →{' '}
                {latest.after} · {relativeTime(latest.at)}
              </>
            ) : (
              'This farm still carries its seeded record.'
            )}
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead title="In the assistant's context" />
        <PanelBody className="space-y-2">
          {[
            `${plants.length} plant ${plants.length === 1 ? 'record' : 'records'}`,
            `Advice ${analysis.advice.modelVersion} · ${analysis.advice.sections.length} sections`,
            `Risk ${analysis.risk.modelVersion} · ${analysis.risk.items.length} items`,
            '14-day weather forecast',
            'Soil test and water balance',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-xs text-ink-2">
              <Check size={12} className="mt-0.5 flex-none text-green-600" aria-hidden />
              <span>{item}</span>
            </div>
          ))}
          <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-ink-3">
            The assistant answers only from this record. It does not browse, call an external model, or invent a number. If
            the data does not cover a question, it says so.
          </p>
        </PanelBody>
      </Panel>
    </aside>
  )
}

function MiniStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1">
        <span className="tnum block font-display text-lg leading-none text-ink">{value}</span>
        {note && <span className="mt-1 block truncate text-[10px] text-ink-3">{note}</span>}
      </dd>
    </div>
  )
}
