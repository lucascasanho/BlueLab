import * as WebAuthnJSON from '@github/webauthn-json';
import axios, { AxiosError } from 'axios';

import ready from '../mastodon/ready';

import 'regenerator-runtime/runtime';

type PublicKeyCredentialCreationOptionsJSON =
  WebAuthnJSON.CredentialCreationOptionsJSON['publicKey'];
type PublicKeyCredentialRequestOptionsJSON =
  WebAuthnJSON.CredentialRequestOptionsJSON['publicKey'];

let conditionalPasskeyAbortController: AbortController | undefined;

function exceptionHasAxiosError(
  error: unknown,
): error is AxiosError<{ error: unknown }> {
  return (
    error instanceof AxiosError &&
    typeof error.response?.data === 'object' &&
    'error' in error.response.data
  );
}

function logAxiosResponseError(error: unknown) {
  if (exceptionHasAxiosError(error)) console.error(error);
}

function getCSRFToken() {
  return document
    .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
    ?.getAttribute('content');
}

function hideFlashMessages() {
  document.querySelectorAll('.flash-message').forEach((flashMessage) => {
    flashMessage.classList.add('hidden');
  });
}

async function callback(
  url: string,
  body:
    | {
        credential: WebAuthnJSON.PublicKeyCredentialWithAttestationJSON;
        nickname: string;
      }
    | {
        user: { credential: WebAuthnJSON.PublicKeyCredentialWithAssertionJSON };
      },
) {
  try {
    const response = await axios.post<{ redirect_path: string }>(
      url,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': getCSRFToken(),
        },
      },
    );

    window.location.replace(response.data.redirect_path);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 422) {
      const errorMessage = document.getElementById(
        'security-key-error-message',
      );
      errorMessage?.classList.remove('hidden');

      logAxiosResponseError(error);
    } else {
      console.error(error);
    }
  }
}

async function handleWebauthnCredentialRegistration(nickname: string) {
  try {
    const response = await axios.get<PublicKeyCredentialCreationOptionsJSON>(
      '/settings/security_keys/options',
    );

    const credentialOptions = response.data;

    try {
      const credential = await WebAuthnJSON.create({
        publicKey: credentialOptions,
      });

      const params = {
        credential: credential,
        nickname: nickname,
      };

      await callback('/settings/security_keys', params);
    } catch (error) {
      const errorMessage = document.getElementById(
        'security-key-error-message',
      );
      errorMessage?.classList.remove('hidden');
      console.error(error);
    }
  } catch (error) {
    logAxiosResponseError(error);
  }
}

function showPasskeyError(cancelled = false) {
  const errorMessage = document.getElementById('passkey-error-message');
  if (!errorMessage) return;

  errorMessage.textContent = cancelled
    ? (errorMessage.dataset.cancelledMessage ?? errorMessage.textContent)
    : (errorMessage.dataset.errorMessage ?? errorMessage.textContent);
  errorMessage.classList.remove('hidden');
}

async function handlePasskeyRegistration(nickname: string) {
  try {
    const response = await axios.get<PublicKeyCredentialCreationOptionsJSON>(
      '/settings/passkeys/options',
    );
    const credential = await WebAuthnJSON.create({ publicKey: response.data });
    const result = await axios.post<{ redirect_path: string }>(
      '/settings/passkeys',
      { credential, nickname },
      { headers: { 'X-CSRF-Token': getCSRFToken() } },
    );

    window.location.replace(result.data.redirect_path);
  } catch (error) {
    showPasskeyError(
      error instanceof DOMException && error.name === 'NotAllowedError',
    );
    logAxiosResponseError(error);
  }
}

async function requestPasskey(
  mediation?: CredentialMediationRequirement,
  signal?: AbortSignal,
) {
  const response = await axios.get<PublicKeyCredentialRequestOptionsJSON>(
    '/auth/passkey/options',
  );
  const credential = await WebAuthnJSON.get({
    publicKey: response.data,
    ...(mediation ? { mediation } : {}),
    ...(signal ? { signal } : {}),
  });
  const result = await axios.post<{ redirect_path: string }>(
    '/auth/passkey',
    { credential },
    { headers: { 'X-CSRF-Token': getCSRFToken() } },
  );

  window.location.replace(result.data.redirect_path);
}

async function handlePasskeyAuthentication() {
  try {
    conditionalPasskeyAbortController?.abort();
    await requestPasskey();
  } catch (error) {
    showPasskeyError(
      error instanceof DOMException && error.name === 'NotAllowedError',
    );
    logAxiosResponseError(error);
  }
}

async function startConditionalPasskeyAuthentication() {
  const conditionalMediationAvailable =
    typeof PublicKeyCredential !== 'undefined' &&
    'isConditionalMediationAvailable' in PublicKeyCredential &&
    (await PublicKeyCredential.isConditionalMediationAvailable());

  if (!conditionalMediationAvailable) return;

  conditionalPasskeyAbortController = new AbortController();

  try {
    await requestPasskey(
      'conditional',
      conditionalPasskeyAbortController.signal,
    );
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      logAxiosResponseError(error);
    }
  }
}

async function handleWebauthnCredentialAuthentication() {
  try {
    const response = await axios.get<PublicKeyCredentialCreationOptionsJSON>(
      'sessions/security_key_options',
    );

    const credentialOptions = response.data;

    try {
      const credential = await WebAuthnJSON.get({
        publicKey: credentialOptions,
      });

      const params = { user: { credential: credential } };
      void callback('sign_in', params);
    } catch (error) {
      const errorMessage = document.getElementById(
        'security-key-error-message',
      );
      errorMessage?.classList.remove('hidden');
      console.error(error);
    }
  } catch (error) {
    logAxiosResponseError(error);
  }
}

ready(() => {
  if (!WebAuthnJSON.supported()) {
    const unsupported_browser_message = document.getElementById(
      'unsupported-browser-message',
    );
    if (unsupported_browser_message) {
      unsupported_browser_message.classList.remove('hidden');
      document
        .querySelectorAll<HTMLButtonElement>(
          'button.btn.js-webauthn, button.btn.js-passkey-authentication, button.btn.js-passkey-registration',
        )
        .forEach((button) => {
          button.disabled = true;
        });
    }
  }

  const webAuthnCredentialRegistrationForm =
    document.querySelector<HTMLFormElement>('form#new_webauthn_credential');
  if (webAuthnCredentialRegistrationForm) {
    webAuthnCredentialRegistrationForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!(event.target instanceof HTMLFormElement)) return;

      const nickname = event.target.querySelector<HTMLInputElement>(
        'input[name="new_webauthn_credential[nickname]"]',
      );

      if (nickname?.value) {
        void handleWebauthnCredentialRegistration(nickname.value);
      } else {
        nickname?.focus();
      }
    });
  }

  const passkeyRegistrationForm =
    document.querySelector<HTMLFormElement>('form#new_passkey');
  if (passkeyRegistrationForm) {
    passkeyRegistrationForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const nickname = passkeyRegistrationForm.querySelector<HTMLInputElement>(
        'input[name="new_passkey[nickname]"]',
      );

      if (nickname?.value) {
        void handlePasskeyRegistration(nickname.value);
      } else {
        nickname?.focus();
      }
    });
  }

  const passkeyAuthenticationForm = document.getElementById(
    'passkey-authentication-form',
  );
  passkeyAuthenticationForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void handlePasskeyAuthentication();
  });

  if (passkeyAuthenticationForm && WebAuthnJSON.supported()) {
    void startConditionalPasskeyAuthentication();
  }

  const webAuthnCredentialAuthenticationForm =
    document.getElementById('webauthn-form');
  if (webAuthnCredentialAuthenticationForm) {
    webAuthnCredentialAuthenticationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      void handleWebauthnCredentialAuthentication();
    });

    const otpAuthenticationForm = document.getElementById(
      'otp-authentication-form',
    );

    const linkToOtp = document.getElementById('link-to-otp');

    linkToOtp?.addEventListener('click', () => {
      webAuthnCredentialAuthenticationForm.classList.add('hidden');
      otpAuthenticationForm?.classList.remove('hidden');
      hideFlashMessages();
    });

    const linkToWebAuthn = document.getElementById('link-to-webauthn');
    linkToWebAuthn?.addEventListener('click', () => {
      otpAuthenticationForm?.classList.add('hidden');
      webAuthnCredentialAuthenticationForm.classList.remove('hidden');
      hideFlashMessages();
    });
  }
}).catch((e: unknown) => {
  throw e;
});
