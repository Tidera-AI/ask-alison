import { motion } from "framer-motion";
import { Monogram } from "@/components/brand/monogram";

export const Greeting = () => {
  return (
    <div className="flex flex-col items-center" key="overview">
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="mb-3 flex size-11 items-center justify-center text-primary sm:mb-5 sm:size-14"
        initial={{ opacity: 0, scale: 0.8 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Monogram className="size-full" />
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-serif font-light text-2xl tracking-tight text-foreground sm:text-3xl md:text-4xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        Welcome! I&apos;m Alison.
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 hidden max-w-md text-center text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:block"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        Your AI etiquette guide, here to help you navigate social and
        professional situations with confidence and grace. What can I help you
        with today?
      </motion.div>
    </div>
  );
};
