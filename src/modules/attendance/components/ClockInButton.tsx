import { motion } from "framer-motion";
import { Play } from "lucide-react";

interface ClockInButtonProps {
  onClockIn: () => void;
  isPending: boolean;
  disabled?: boolean;
}

export function ClockInButton({
  onClockIn,
  isPending,
  disabled = false,
}: Readonly<ClockInButtonProps>) {
  return (
    <motion.button
      type="button"
      onClick={onClockIn}
      disabled={isPending || disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      className="btn-primary-grad disabled:pointer-events-none disabled:opacity-60"
    >
      <span className="relative z-10 flex items-center justify-center gap-2.5">
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
        ) : (
          <Play className="size-4 fill-white" aria-hidden="true" />
        )}
        Clock In Now
      </span>
    </motion.button>
  );
}
