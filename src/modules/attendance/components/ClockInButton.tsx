import { motion } from "framer-motion";

interface ClockInButtonProps {
  onClockIn: () => void;
  isPending: boolean;
}

export function ClockInButton({ onClockIn, isPending }: Readonly<ClockInButtonProps>) {
  return (
    <motion.button
      type="button"
      onClick={onClockIn}
      disabled={isPending}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      aria-label="Clock in"
      className="relative group overflow-hidden bg-primary text-white text-sm font-medium px-8 py-3 rounded-lg shadow-none disabled:opacity-60 disabled:pointer-events-none transition-shadow"
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
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
          <svg
            className="size-4 transition-transform group-hover:rotate-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        Clock In Now
      </span>
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
    </motion.button>
  );
}
