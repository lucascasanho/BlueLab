import { IntlProvider } from 'react-intl';

import { configureStore } from '@reduxjs/toolkit';
import { fromJS } from 'immutable';
import { Provider } from 'react-redux';

import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { AltTextModal } from '@/mastodon/features/alt_text_modal';
import { reducerWithInitialState } from '@/mastodon/reducers';
import { defaultMiddleware } from '@/mastodon/store/store';

import { ComposeUpload } from './upload';

const renderUpload = (type: 'image' | 'video' = 'image') => {
  const reducer = reducerWithInitialState({
    compose: {
      media_attachments: [
        fromJS({
          id: 'media-1',
          type,
          url:
            type === 'video'
              ? 'https://example.com/video.mp4'
              : 'https://example.com/image.jpg',
          preview_url: 'https://example.com/preview.jpg',
          description: null,
          blurhash: null,
          unattached: true,
          meta: {
            original: { width: 1200, height: 800 },
            focus: { x: 0, y: 0 },
          },
        }),
      ],
    },
  });
  const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware(defaultMiddleware),
  });

  const view = render(
    <Provider store={store}>
      <IntlProvider locale='en'>
        <ComposeUpload id='media-1' />
      </IntlProvider>
    </Provider>,
  );

  return { ...view, store };
};

describe('ComposeUpload', () => {
  test('opens the alt-text editor when the media thumbnail is activated', () => {
    const { store } = renderUpload();

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit media and alt text' }),
    );

    const modal = store.getState().modal.get('stack').first();
    expect(modal?.get('modalType')).toBe('FOCAL_POINT');
    expect(modal?.get('modalProps')).toEqual({ mediaId: 'media-1' });
  });

  test('renders a playable video with media actions', () => {
    const { container } = renderUpload('video');

    expect(container.querySelector('video[controls]')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Edit media and alt text' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove media' })).toBeTruthy();
  });

  test('keeps the real alt-text editor accessible from the media thumbnail', () => {
    const { store } = renderUpload();
    const onClose = vi.fn();

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit media and alt text' }),
    );

    render(
      <Provider store={store}>
        <IntlProvider locale='en'>
          <AltTextModal mediaId='media-1' onClose={onClose} />
        </IntlProvider>
      </Provider>,
    );

    const description = screen.getByPlaceholderText(
      'Describe this for people with visual impairments…',
    );
    fireEvent.change(description, { target: { value: 'A useful alt text' } });

    expect((description as HTMLTextAreaElement).value).toBe(
      'A useful alt text',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
