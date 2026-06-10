import { motion } from "framer-motion";

interface ClockOutButtonProps {
  onClockOut: () => void;
  isPending: boolean;
}


export function ClockOutButton({ onClockOut, isPending }: Readonly<ClockOutButtonProps>) {
  return (
    <motion.button
      type="button"
      onClick={onClockOut}
      disabled={isPending}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      className="clock-btn inline-flex items-center justify-center gap-2 btn-clockout-border text-sm px-8 py-3 disabled:opacity-60 disabled:pointer-events-none cursor-pointer whitespace-nowrap"
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
    </motion.button>
  );
}
