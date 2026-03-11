export function LoadingSpinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span
      className={`inline-block ${dim} animate-spin rounded-full border-2 border-white/30 border-t-white`}
    />
  );
}
