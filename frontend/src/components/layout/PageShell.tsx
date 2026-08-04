import type { ReactNode } from "react";
import { motion } from "framer-motion";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative z-10 mx-auto max-w-7xl px-6 py-16"
    >
      {children}
    </motion.main>
  );
}
