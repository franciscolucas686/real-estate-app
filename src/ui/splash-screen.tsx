import { motion } from 'motion/react';

export function SplashScreen() {
  return (
    <motion.img
      src="/logo.png"
      alt="Logo"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="size-72 object-contain"
    />
  );
}
