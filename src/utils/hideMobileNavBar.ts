// src/utils/hideMobileNavBar.ts
export const hideMobileNavBar = () => {
  if (typeof window === 'undefined') return; // segurança para SSR

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!isMobile) return; // só aplica em mobile

  window.addEventListener('load', () => {
    // Rola 1px para ativar o "scroll fullscreen" do navegador mobile
    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 0);

    // Opcional: também rola ao redimensionar para manter o efeito
    window.addEventListener('resize', () => {
      window.scrollTo(0, 1);
    });
  });
};
