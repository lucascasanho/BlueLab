import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIntl } from 'react-intl';

import api from '@/mastodon/api';
import { Button } from '@/mastodon/components/button';

import { getBugReportDiagnostics } from './diagnostics';
import classes from './bug_report_modal.module.scss';

type Copy = {
  title: string;
  lead: string;
  description: string;
  placeholder: string;
  attachments: string;
  attachmentHint: string;
  chooseFiles: string;
  dropFiles: string;
  remove: string;
  sending: string;
  submit: string;
  cancel: string;
  successTitle: string;
  successBody: string;
  close: string;
  diagnosticNotice: string;
  required: string;
  sendError: string;
  characters: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: 'Report a bug',
    lead: 'Describe what went wrong and attach screenshots, GIFs, audio or video when useful.',
    description: 'What happened?',
    placeholder: 'Describe the bug, what you expected to happen, and how to reproduce it.',
    attachments: 'Attachments',
    attachmentHint: 'Images, GIFs, audio and video. Up to 5 files.',
    chooseFiles: 'Choose files',
    dropFiles: 'or drag files here',
    remove: 'Remove',
    sending: 'Sending…',
    submit: 'Send report',
    cancel: 'Cancel',
    successTitle: 'Bug report sent',
    successBody: 'Your report was sent to the instance administrators with the available technical diagnostics.',
    close: 'Close',
    diagnosticNotice: 'This report automatically includes browser and operating-system information, interface language, theme, interface mode and recent client errors.',
    required: 'Describe the problem before sending.',
    sendError: 'The report could not be sent. Please try again.',
    characters: '{current}/5000',
  },
  'pt-BR': {
    title: 'Relatar bug',
    lead: 'Descreva o que aconteceu e anexe capturas, GIFs, áudio ou vídeo quando forem úteis.',
    description: 'O que aconteceu?',
    placeholder: 'Descreva o bug, o que você esperava que acontecesse e como reproduzir o problema.',
    attachments: 'Anexos',
    attachmentHint: 'Imagens, GIFs, áudio e vídeo. Até 5 arquivos.',
    chooseFiles: 'Escolher arquivos',
    dropFiles: 'ou arraste os arquivos aqui',
    remove: 'Remover',
    sending: 'Enviando…',
    submit: 'Enviar relato',
    cancel: 'Cancelar',
    successTitle: 'Relato enviado',
    successBody: 'Seu relato foi enviado aos administradores da instância com os diagnósticos técnicos disponíveis.',
    close: 'Fechar',
    diagnosticNotice: 'O relato inclui automaticamente informações do navegador e sistema operacional, idioma, tema, modo da interface e erros recentes do cliente.',
    required: 'Descreva o problema antes de enviar.',
    sendError: 'Não foi possível enviar o relato. Tente novamente.',
    characters: '{current}/5000',
  },
  es: {
    title: 'Informar un error',
    lead: 'Describe lo ocurrido y adjunta capturas, GIF, audio o vídeo cuando sea útil.',
    description: '¿Qué ocurrió?',
    placeholder: 'Describe el error, lo que esperabas que ocurriera y cómo reproducir el problema.',
    attachments: 'Adjuntos',
    attachmentHint: 'Imágenes, GIF, audio y vídeo. Hasta 5 archivos.',
    chooseFiles: 'Elegir archivos',
    dropFiles: 'o arrastra los archivos aquí',
    remove: 'Eliminar',
    sending: 'Enviando…',
    submit: 'Enviar informe',
    cancel: 'Cancelar',
    successTitle: 'Informe enviado',
    successBody: 'Tu informe se envió a los administradores de la instancia con los diagnósticos técnicos disponibles.',
    close: 'Cerrar',
    diagnosticNotice: 'El informe incluye automáticamente información del navegador y del sistema operativo, idioma, tema, modo de interfaz y errores recientes del cliente.',
    required: 'Describe el problema antes de enviarlo.',
    sendError: 'No se pudo enviar el informe. Inténtalo de nuevo.',
    characters: '{current}/5000',
  },
  fr: {
    title: 'Signaler un bug',
    lead: 'Décrivez le problème et joignez des captures, des GIF, de l’audio ou de la vidéo si nécessaire.',
    description: 'Que s’est-il passé ?',
    placeholder: 'Décrivez le bug, le résultat attendu et les étapes pour reproduire le problème.',
    attachments: 'Pièces jointes',
    attachmentHint: 'Images, GIF, audio et vidéo. Jusqu’à 5 fichiers.',
    chooseFiles: 'Choisir des fichiers',
    dropFiles: 'ou faites glisser les fichiers ici',
    remove: 'Supprimer',
    sending: 'Envoi…',
    submit: 'Envoyer le rapport',
    cancel: 'Annuler',
    successTitle: 'Rapport envoyé',
    successBody: 'Votre rapport a été envoyé aux administrateurs de l’instance avec les diagnostics techniques disponibles.',
    close: 'Fermer',
    diagnosticNotice: 'Le rapport inclut automatiquement les informations du navigateur et du système d’exploitation, la langue, le thème, le mode d’interface et les erreurs récentes du client.',
    required: 'Décrivez le problème avant de l’envoyer.',
    sendError: 'Impossible d’envoyer le rapport. Réessayez.',
    characters: '{current}/5000',
  },
};

const getCopy = (locale: string) => {
  const normalized = locale.toLowerCase();
  if (COPY[locale]) return COPY[locale];
  if (normalized.startsWith('pt')) return COPY['pt-BR'];
  if (normalized.startsWith('es')) return COPY.es;
  if (normalized.startsWith('fr')) return COPY.fr;
  return COPY.en;
};

const isSupportedFile = (file: File) =>
  file.type.startsWith('image/') ||
  file.type.startsWith('video/') ||
  file.type.startsWith('audio/');

const Preview: React.FC<{
  file: File;
  onRemove: () => void;
  removeLabel: string;
}> = ({ file, onRemove, removeLabel }) => {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className={classes.previewCard}>
      {file.type.startsWith('image/') ? (
        <img src={url} alt='' />
      ) : file.type.startsWith('video/') ? (
        <video src={url} controls preload='metadata' />
      ) : (
        <audio src={url} controls />
      )}
      <div className={classes.previewMeta}>
        <span title={file.name}>{file.name}</span>
        <button type='button' onClick={onRemove}>
          {removeLabel}
        </button>
      </div>
    </div>
  );
};

export const BugReportModal: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const intl = useIntl();
  const copy = getCopy(intl.locale);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const supported = Array.from(incoming).filter(isSupportedFile);

    setFiles((current) => [...current, ...supported].slice(0, 5));
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = description.trim();

    if (!trimmed) {
      setError(copy.required);
      return;
    }

    setError('');
    setSending(true);

    try {
      const diagnostics = getBugReportDiagnostics(intl.locale);
      const form = new FormData();

      form.append('description', trimmed);
      form.append('interface_language', diagnostics.interface_language);
      form.append('theme', diagnostics.theme);
      form.append('interface_layout', diagnostics.interface_layout);
      form.append('current_path', diagnostics.current_path);
      form.append('viewport', diagnostics.viewport);
      form.append('app_version', diagnostics.app_version);
      form.append('client_errors', JSON.stringify(diagnostics.client_errors));

      files.forEach((file) => form.append('files[]', file, file.name));

      await api().post('/api/v1/bug_reports', form);
      setSubmitted(true);
    } catch {
      setError(copy.sendError);
    } finally {
      setSending(false);
    }
  }, [copy, description, files, intl.locale]);

  if (submitted) {
    return (
      <div className={`modal-root__modal ${classes.root}`}>
        <div className={classes.header}>
          <h1>{copy.successTitle}</h1>
        </div>
        <div className={classes.body}>
          <p>{copy.successBody}</p>
        </div>
        <div className={classes.actions}>
          <Button onClick={onClose}>{copy.close}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`modal-root__modal ${classes.root}`}>
      <div className={classes.header}>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
      </div>

      <div className={classes.body}>
        <label className={classes.label} htmlFor='bug-report-description'>
          {copy.description}
        </label>
        <textarea
          id='bug-report-description'
          className={classes.textarea}
          value={description}
          maxLength={5000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={copy.placeholder}
          autoFocus
          rows={8}
        />

        <div className={classes.counter}>
          {copy.characters.replace('{current}', String(description.length))}
        </div>

        <div className={classes.section}>
          <div className={classes.label}>{copy.attachments}</div>
          <p className={classes.hint}>{copy.attachmentHint}</p>

          <div
            className={`${classes.dropZone} ${dragging ? classes.dropZoneActive : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <Button
              type='button'
              onClick={() => fileInputRef.current?.click()}
            >
              {copy.chooseFiles}
            </Button>
            <span>{copy.dropFiles}</span>
            <input
              ref={fileInputRef}
              className={classes.hiddenInput}
              type='file'
              accept='image/*,video/*,audio/*'
              multiple
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </div>

          {files.length > 0 && (
            <div className={classes.previewGrid}>
              {files.map((file, index) => (
                <Preview
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  onRemove={() =>
                    setFiles((current) =>
                      current.filter((_, fileIndex) => fileIndex !== index),
                    )
                  }
                  removeLabel={copy.remove}
                />
              ))}
            </div>
          )}
        </div>

        <p className={classes.notice}>{copy.diagnosticNotice}</p>
        {error && <p className={classes.error}>{error}</p>}
      </div>

      <div className={classes.actions}>
        <Button type='button' onClick={onClose} disabled={sending}>
          {copy.cancel}
        </Button>
        <Button
          type='button'
          onClick={handleSubmit}
          disabled={sending || description.trim().length === 0}
        >
          {sending ? copy.sending : copy.submit}
        </Button>
      </div>
    </div>
  );
};
