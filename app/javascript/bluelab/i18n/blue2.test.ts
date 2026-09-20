import { blue2Text } from './blue2';

describe('blue2Text', () => {
  it('returns the localized label after normalizing a regional locale', () => {
    expect(blue2Text('PT_br', 'write')).toBe('Escrever');
  });

  it('falls back to English when the locale is unavailable', () => {
    expect(blue2Text('sv-SE', 'newConversation')).toBe('New conversation');
  });
});
