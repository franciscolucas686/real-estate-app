import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '@/shared/api/api-error';

describe('getErrorMessage', () => {
  it('retorna a mensagem amigável quando code está mapeado', () => {
    const err = {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email ou senha inválidos',
    };
    expect(getErrorMessage(err)).toBe('Email ou senha incorretos.');
  });

  it('cai no passthrough de message quando code não está mapeado', () => {
    const err = {
      statusCode: 500,
      code: 'SOME_UNMAPPED_CODE',
      message: 'mensagem crua do backend',
    };
    expect(getErrorMessage(err)).toBe('mensagem crua do backend');
  });

  it('faz passthrough de message string quando code está ausente', () => {
    const err = { statusCode: 400, message: 'Campo obrigatório' };
    expect(getErrorMessage(err)).toBe('Campo obrigatório');
  });

  it('concatena message array quando code está ausente', () => {
    const err = { statusCode: 400, message: ['Campo A inválido', 'Campo B inválido'] };
    expect(getErrorMessage(err)).toBe('Campo A inválido Campo B inválido');
  });

  /**
   * O ValidationPipe do backend manda `VALIDATION_ERROR` com uma mensagem por campo inválido.
   * Enquanto esse code esteve no mapa, `getErrorMessage` o resolvia primeiro e trocava tudo
   * isso por "Verifique os campos destacados e tente novamente" — uma frase que nem nomeava o
   * campo nem correspondia à UI (nenhum formulário do app destaca campo). Tirá-lo do mapa é o
   * que devolve a informação; este caso é o que impede alguém de recolocá-lo.
   */
  it('VALIDATION_ERROR mostra o que o backend disse, campo a campo', () => {
    const err = {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: ['Bairro deve ter no mínimo 2 caracteres'],
    };
    expect(getErrorMessage(err)).toBe('Bairro deve ter no mínimo 2 caracteres');
  });

  it('VALIDATION_ERROR com vários campos junta todos', () => {
    const err = {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: ['Bairro deve ter no mínimo 2 caracteres', 'Descrição deve ter no mínimo 10'],
    };
    expect(getErrorMessage(err)).toBe(
      'Bairro deve ter no mínimo 2 caracteres Descrição deve ter no mínimo 10',
    );
  });

  it('retorna a mensagem genérica de fallback quando nada é utilizável', () => {
    expect(getErrorMessage({})).toBe('Algo deu errado. Tente novamente.');
    expect(getErrorMessage(null)).toBe('Algo deu errado. Tente novamente.');
    expect(getErrorMessage(undefined)).toBe('Algo deu errado. Tente novamente.');
  });

  it('usa err.message quando é uma instância de Error', () => {
    expect(getErrorMessage(new Error('falha de rede'))).toBe('falha de rede');
  });
});
