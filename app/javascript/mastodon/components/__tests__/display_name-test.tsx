import { accountFactoryImmutable } from '@/testing/factories';
import { fireEvent, render, screen } from '@/testing/rendering';

import { DisplayName } from '../display_name';

describe('<DisplayName />', () => {
  const account = accountFactoryImmutable({
    username: 'alice',
    acct: 'alice@remote.example',
    display_name: 'Alice',
  });

  it('renders a short handle without changing the display name', () => {
    render(<DisplayName account={account} variant='shortHandle' />);

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('@alice')).toBeTruthy();
    expect(screen.queryByText('@alice@remote.example')).toBeNull();
  });

  it('renders the full handle without an expansion control', () => {
    const { container } = render(<DisplayName account={account} />);

    expect(container.querySelector('.display-name__account')?.textContent).toBe(
      '@alice@remote.example',
    );
    expect(screen.queryByRole('button', { name: /username/i })).toBeNull();
  });

  it('does not add an incomplete domain when the local domain is unavailable', () => {
    const localAccount = account.set('acct', 'alice');
    const { container } = render(<DisplayName account={localAccount} />);

    expect(container.querySelector('.display-name__account')?.textContent).toBe(
      '@alice',
    );
  });

  it('shows an accessible lock for a private account', () => {
    const lockedAccount = account.set('locked', true);
    const { container } = render(<DisplayName account={lockedAccount} />);

    expect(screen.getByRole('img', { name: /manually reviews/i })).toBeTruthy();
    expect(
      container.querySelector('.display-name__name .display-name__locked'),
    ).toBeTruthy();
    expect(
      container.querySelector('.display-name__account .display-name__locked'),
    ).toBeNull();
  });

  it('shows the lock beside the name in the simple profile variant', () => {
    const lockedAccount = account.set('locked', true);
    const { container } = render(
      <DisplayName account={lockedAccount} variant='simple' />,
    );

    expect(
      container.querySelector('.display-name__name .display-name__locked'),
    ).toBeTruthy();
  });

  it('does not reserve a lock element for a public account', () => {
    const { container } = render(<DisplayName account={account} />);

    expect(container.querySelector('.display-name__locked')).toBeNull();
  });

  it('renders the instance verification badge immediately after the display name', () => {
    const verifiedAccount = account.set('verified_by_role', true);
    render(<DisplayName account={verifiedAccount} />);

    const displayName = screen.getByText('Alice');
    const badge = screen.getByRole('button', { name: 'Verified account' });

    expect(displayName.nextElementSibling).toBe(badge);
  });

  it('supports the exact Verificado role as a backward-compatible fallback', () => {
    const verifiedAccount = accountFactoryImmutable({
      username: 'verified',
      display_name: 'Verified',
      roles: [{ id: '1', name: 'Verificado', color: '' }],
    });
    render(<DisplayName account={verifiedAccount} />);

    expect(
      screen.getByRole('button', { name: 'Verified account' }),
    ).toBeTruthy();
  });

  it('does not infer verification from a differently-cased role name', () => {
    const unverifiedAccount = accountFactoryImmutable({
      username: 'unverified',
      display_name: 'Unverified',
      roles: [{ id: '1', name: 'verificado', color: '' }],
    });
    render(<DisplayName account={unverifiedAccount} />);

    expect(
      screen.queryByRole('button', { name: 'Verified account' }),
    ).toBeNull();
  });

  it('opens an accessible popover with the persisted verification date', () => {
    const verifiedAccount = account
      .set('verified_by_role', true)
      .set('verified_by_role_since', '2026-09-05T12:00:00.000Z');
    render(<DisplayName account={verifiedAccount} />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: 'Verified account' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Verified since:/)).toBeTruthy();
  });

  it('uses a distinct SVG gradient for every rendered badge', () => {
    const verifiedAccount = account.set('verified_by_role', true);
    const { container } = render(
      <>
        <DisplayName account={verifiedAccount} />
        <DisplayName account={verifiedAccount.set('id', '2')} />
      </>,
    );
    const gradientIds = Array.from(
      container.querySelectorAll('linearGradient[id^="bluelab-verified-"]'),
      (gradient) => gradient.id,
    );

    expect(gradientIds).toHaveLength(2);
    expect(new Set(gradientIds).size).toBe(gradientIds.length);
  });
});
