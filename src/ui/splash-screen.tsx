import { motion } from 'motion/react';

export function SplashScreen() {
  return (
    // `sizes` é literal porque o slot é literal: `size-72` são 288px CSS em qualquer
    // viewport, sem breakpoint. O que decide a nitidez não é esse número e sim
    // `288 × DPR` — 288px num desktop comum, 576 num Retina, 864 num celular moderno —,
    // e é por isso que a escada vai até 1024. O arquivo único de antes tinha 484px, ou
    // seja, entregava ~56% da resolução necessária em DPR 3. Servir só o 1024 resolveria
    // a nitidez e faria um desktop baixar 157KB para preencher 288px; com o `srcset` cada
    // aparelho pega um degrau só. Esta é a primeira coisa pintada no boot, então o peso
    // aqui importa mais do que em qualquer outra imagem do app.
    <motion.img
      src="/icons/logo-576.webp"
      srcSet="/icons/logo-384.webp 384w, /icons/logo-576.webp 576w, /icons/logo-1024.webp 1024w"
      sizes="288px"
      alt="Logo"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="size-72 object-contain"
    />
  );
}
