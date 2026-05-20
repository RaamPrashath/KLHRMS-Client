"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))
const LOOP_COPIES = 7
const MIDDLE_COPY_INDEX = Math.floor(LOOP_COPIES / 2)
const ITEM_HEIGHT = 40

export interface TimePickerMinTime {
  hour: number
  minute: number
}

export interface TimePickerProps {
  hour: string
  minute: string
  onHourChange: (hour: string) => void
  onMinuteChange: (minute: string) => void
  /** When set, hours/minutes before this time are disabled (used when selected date is today) */
  minTime?: TimePickerMinTime
  disabled?: boolean
}

interface LoopingTimeSelectProps {
  ariaLabel: string
  disabled?: boolean
  options: readonly string[]
  placeholder: string
  value: string
  onChange: (value: string) => void
  isOptionDisabled?: (value: string) => boolean
}

function LoopingTimeSelect({
  ariaLabel,
  disabled,
  options,
  placeholder,
  value,
  onChange,
  isOptionDisabled,
}: LoopingTimeSelectProps) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const cycleHeight = options.length * ITEM_HEIGHT
  const loopedOptions = React.useMemo(
    () => Array.from({ length: LOOP_COPIES }, () => options).flat(),
    [options]
  )

  React.useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  React.useLayoutEffect(() => {
    if (!open || !scrollRef.current) return

    const selectedIndex = Math.max(0, options.indexOf(value))
    scrollRef.current.scrollTop = (MIDDLE_COPY_INDEX * options.length + selectedIndex) * ITEM_HEIGHT
  }, [open, options, value])

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const target = event.currentTarget

    if (target.scrollTop < cycleHeight) {
      target.scrollTop += cycleHeight
      return
    }

    if (target.scrollTop > cycleHeight * (LOOP_COPIES - 2)) {
      target.scrollTop -= cycleHeight
    }
  }

  function handleSelect(nextValue: string) {
    if (isOptionDisabled?.(nextValue)) return
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex h-11 w-[96px] items-center justify-between rounded-xl border border-neutral-200 bg-surface px-3 text-base text-neutral-900 shadow-none outline-none transition-[border-color,box-shadow] hover:bg-neutral-50 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value || placeholder}</span>
        <ChevronDown className="size-4 text-neutral-400" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-2 h-[300px] max-h-[300px] min-h-[300px] w-[96px] overflow-hidden rounded-xl border border-neutral-200 bg-surface shadow-[var(--shadow-3)]"
          role="presentation"
        >
          <div
            ref={scrollRef}
            className="h-[300px] max-h-[300px] min-h-[300px] overflow-y-auto overscroll-contain py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="listbox"
            aria-label={ariaLabel}
            onScroll={handleScroll}
          >
            {loopedOptions.map((option, index) => {
              const optionDisabled = isOptionDisabled?.(option) ?? false
              const selected = value === option

              return (
                <button
                  key={`${option}-${index}`}
                  type="button"
                  className={cn(
                    "flex h-10 w-full items-center px-3 text-left text-sm tabular-nums outline-none transition-colors",
                    selected && "bg-primary-ghost font-semibold text-primary",
                    !selected && "text-neutral-700 hover:bg-neutral-50",
                    optionDisabled && "cursor-not-allowed text-neutral-300 hover:bg-transparent"
                  )}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={optionDisabled}
                  disabled={optionDisabled}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function TimePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  minTime,
  disabled,
}: TimePickerProps) {
  const currentHour = parseInt(hour, 10)

  // Auto-correct minute when hour changes to the minTime hour and minute is before minTime minute
  React.useEffect(() => {
    if (!minTime) return
    const parsedHour = parseInt(hour, 10)
    const parsedMinute = parseInt(minute, 10)
    if (parsedHour === minTime.hour && parsedMinute < minTime.minute) {
      const nextValid = MINUTES.find((m) => parseInt(m, 10) >= minTime.minute)
      if (nextValid) {
        onMinuteChange(nextValid)
      }
    }
  }, [hour, minTime, minute, onMinuteChange])

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Time picker">
      <LoopingTimeSelect
        ariaLabel="Select hour"
        disabled={disabled}
        options={HOURS}
        placeholder="HH"
        value={hour}
        onChange={onHourChange}
        isOptionDisabled={(h) => minTime !== undefined && parseInt(h, 10) < minTime.hour}
      />

      <span
        className="text-base font-medium text-neutral-400 select-none"
        aria-hidden="true"
      >
        :
      </span>

      <LoopingTimeSelect
        ariaLabel="Select minute"
        disabled={disabled}
        options={MINUTES}
        placeholder="MM"
        value={minute}
        onChange={onMinuteChange}
        isOptionDisabled={(m) => {
          const parsedM = parseInt(m, 10)
          return (
            minTime !== undefined &&
            currentHour === minTime.hour &&
            parsedM < minTime.minute
          )
        }}
      />
    </div>
  )
}
