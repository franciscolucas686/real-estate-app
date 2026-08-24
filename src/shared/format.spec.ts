import { describe, expect, it } from 'vitest';
import {
  buildInstagramUrl,
  buildOwnerWhatsAppUrl,
  buildWhatsAppUrl,
  normalizeInstagramHandle,
  toPlaceCase,
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

/**
 * Governa três campos pelo `onChange` — Cidade e Bairro (`step-2.tsx`) e o nome do
 * proprietário (`step-1.tsx`) — e não tinha nenhum teste. Os casos abaixo são os que
 * decidem se ela serve para nome de pessoa, que é o uso mais recente.
 */
describe('toPlaceCase', () => {
  it('sobe a inicial de cada palavra', () => {
    expect(toPlaceCase('maria silva')).toBe('Maria Silva');
  });

  it('mantém o conectivo em minúscula a partir da segunda palavra', () => {
    expect(toPlaceCase('maria da silva')).toBe('Maria da Silva');
    expect(toPlaceCase('joão dos santos')).toBe('João dos Santos');
  });

  it('capitaliza o conectivo quando ele abre o nome', () => {
    // A regra é posicional, e para nome de pessoa é o comportamento certo: quem se chama
    // "Dos Santos" não vira "dos Santos".
    expect(toPlaceCase('dos santos')).toBe('Dos Santos');
  });

  it('baixa o resto da palavra, então caps lock não passa', () => {
    expect(toPlaceCase('JOÃO')).toBe('João');
    expect(toPlaceCase('MARIA DA SILVA')).toBe('Maria da Silva');
  });

  it('preserva o comprimento, inclusive espaços — é o que não desloca o caret', () => {
    // Digitar "maria " e continuar não pode reposicionar o cursor nem comer o espaço.
    expect(toPlaceCase('maria ')).toBe('Maria ');
    expect(toPlaceCase('maria  silva')).toHaveLength('maria  silva'.length);
  });

  it('devolve string vazia intacta', () => {
    expect(toPlaceCase('')).toBe('');
  });
});
