interface ClockOutButtonProps {
  onClockOut: () => void;
  isPending: boolean;
}

export function ClockOutButton({ onClockOut, isPending }: Readonly<ClockOutButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClockOut}
      disabled={isPending}
      aria-label="Clock out"
      className="inline-flex items-center justify-center gap-2 bg-destructive-bg border border-destructive-border text-destructive-text hover:bg-[#f5c6c5] text-sm font-medium px-4 py-2 rounded-md min-h-[44px] min-w-[44px] disabled:opacity-60 disabled:pointer-events-none transition-colors duration-100"
    >
      {isPending ? (
        <svg
          className="animate-spin size-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : null}
      Clock Out
    </button>
  );
}
