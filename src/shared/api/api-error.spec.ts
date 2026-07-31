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

  it('retorna a mensagem genérica de fallback quando nada é utilizável', () => {
    expect(getErrorMessage({})).toBe('Algo deu errado. Tente novamente.');
    expect(getErrorMessage(null)).toBe('Algo deu errado. Tente novamente.');
    expect(getErrorMessage(undefined)).toBe('Algo deu errado. Tente novamente.');
  });

  it('usa err.message quando é uma instância de Error', () => {
    expect(getErrorMessage(new Error('falha de rede'))).toBe('falha de rede');
  });
});
