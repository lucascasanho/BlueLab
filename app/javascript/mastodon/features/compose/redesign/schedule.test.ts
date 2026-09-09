import { scheduledIso } from './schedule';

describe('scheduledIso', () => {
  test('converts the selected timezone to the backend UTC instant', () => {
    expect(scheduledIso('2026-09-10T12:30', 'UTC')).toBe(
      '2026-09-10T12:30:00.000Z',
    );
    expect(scheduledIso('2026-09-10T12:30', 'America/Cuiaba')).toBe(
      '2026-09-10T16:30:00.000Z',
    );
  });
});
