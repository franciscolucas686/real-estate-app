import { describe, expect, it } from 'vitest';
import {
  buildInstagramUrl,
  buildOwnerWhatsAppUrl,
  buildWhatsAppUrl,
  normalizeInstagramHandle,
} from '@/shared/format';

/**
 * O que se guarda é o handle, não a URL — mesma decisão que faz o WhatsApp guardar só dígitos.
 * Esta função é o que torna essa decisão indolor para quem preenche: o Instagram compartilha
 * perfis como URL completa (com `www.`, barra final e um `?igshid=…` colado por ele mesmo), e
 * as pessoas escrevem handles com `@`. Todas essas formas precisam chegar ao mesmo lugar, ou a
 * validação vira uma parede na cara do operador.
 */
describe('normalizeInstagramHandle', () => {
  it('devolve um handle puro inalterado', () => {
    expect(normalizeInstagramHandle('francinegestora')).toBe('francinegestora');
  });

  it('tira o "@" que as pessoas escrevem', () => {
    expect(normalizeInstagramHandle('@francinegestora')).toBe('francinegestora');
  });

  it('reduz a URL completa ao handle, com ou sem protocolo e www', () => {
    expect(normalizeInstagramHandle('https://www.instagram.com/francinegestora')).toBe(
      'francinegestora',
    );
    expect(normalizeInstagramHandle('http://instagram.com/francinegestora')).toBe(
      'francinegestora',
    );
    expect(normalizeInstagramHandle('instagram.com/francinegestora')).toBe('francinegestora');
  });

  it('descarta barra final, query e fragmento', () => {
    // O `?igshid=` é o que o próprio botão de compartilhar do Instagram cola na URL.
    expect(normalizeInstagramHandle('https://instagram.com/francinegestora/?igshid=abc123')).toBe(
      'francinegestora',
    );
    expect(normalizeInstagramHandle('instagram.com/francinegestora#sobre')).toBe('francinegestora');
  });

  it('apara espaços em volta, que sobram de um colar', () => {
    expect(normalizeInstagramHandle('  @francinegestora  ')).toBe('francinegestora');
  });

  it('devolve vazio para vazio — é o valor de "não configurado"', () => {
    expect(normalizeInstagramHandle('')).toBe('');
    expect(normalizeInstagramHandle('   ')).toBe('');
  });
});

describe('buildInstagramUrl', () => {
  it('monta a URL do perfil a partir do handle', () => {
    expect(buildInstagramUrl('francinegestora')).toBe('https://instagram.com/francinegestora');
  });

  it('re-normaliza por dentro, cobrindo valor gravado antes da regra existir', () => {
    expect(buildInstagramUrl('@francinegestora')).toBe('https://instagram.com/francinegestora');
    expect(buildInstagramUrl('https://www.instagram.com/francinegestora/')).toBe(
      'https://instagram.com/francinegestora',
    );
  });
});

/**
 * Os dois links de WhatsApp da página de detalhes apontam para pessoas diferentes e falam em
 * vozes diferentes. Confundi-los não é erro de texto: é a imobiliária mandando "tenho
 * interesse no imóvel" para o dono do imóvel.
 */
describe('links de WhatsApp', () => {
  it('o do visitante fala na voz de quem procura', () => {
    const url = buildWhatsAppUrl('11999990000', '0001');
    expect(url).toContain('wa.me/5511999990000');
    expect(decodeURIComponent(url)).toContain('Tenho interesse no imóvel de código 0001');
  });

  it('o do proprietário fala na voz da imobiliária', () => {
    const url = buildOwnerWhatsAppUrl('15988887777', '0001');
    expect(url).toContain('wa.me/5515988887777');
    const message = decodeURIComponent(url);
    expect(message).toContain('Francine Gestora Imobiliária');
    expect(message).toContain('o seu imóvel de código 0001');
    expect(message).not.toContain('Tenho interesse');
  });

  it('os dois aceitam número já formatado — o `onlyDigits` é rede para dado antigo', () => {
    expect(buildOwnerWhatsAppUrl('(15) 98888-7777')).toContain('wa.me/5515988887777');
    expect(buildWhatsAppUrl('(11) 99999-0000')).toContain('wa.me/5511999990000');
  });

  it('sem código do imóvel, a mensagem continua fazendo sentido', () => {
    expect(decodeURIComponent(buildOwnerWhatsAppUrl('15988887777'))).toContain('o seu imóvel.');
  });
});
