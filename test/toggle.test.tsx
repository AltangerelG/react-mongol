import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MongolToggle } from '../src/index.js';

describe('MongolToggle', () => {
  beforeEach(() => window.localStorage.clear());

  it('switches the page to traditional script and back, with the real converter', async () => {
    render(
      <>
        <MongolToggle />
        <main>
          <p>Монгол улс</p>
        </main>
      </>,
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText(/ᠮᠣᠩᠭ/)).toBeTruthy(), { timeout: 10_000 });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toBe('Кирилл'); // the button itself is never converted
    expect(document.querySelector('main')!.hasAttribute('data-mongol-vertical-on')).toBe(true);
    expect(window.localStorage.getItem('react-mongol:script')).toBe('on');

    await act(async () => fireEvent.click(button));
    expect(document.querySelector('main p')!.textContent).toBe('Монгол улс');
    expect(document.querySelector('main')!.hasAttribute('data-mongol-vertical-on')).toBe(false);
  });

  it('applies a site dictionary over the automatic conversion', async () => {
    render(
      <>
        <MongolToggle persist={false} dictionary={{ Улс: 'CUSTOM' }} />
        <main>
          <p>улс</p>
        </main>
      </>,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(document.querySelector('main p')!.textContent).toBe('CUSTOM'), { timeout: 10_000 });
  });
});
