import { AlertsController } from 'mastodon/components/alerts_controller';
import ComposeFormContainer from 'mastodon/features/compose/containers/compose_form_container';
import { RedesignComposeForm } from 'mastodon/features/compose/redesign';
import { selectComposerEditor } from 'mastodon/reducers/slices/composer';
import { useAppSelector } from 'mastodon/store';
import LoadingBarContainer from 'mastodon/features/ui/containers/loading_bar_container';
import ModalContainer from 'mastodon/features/ui/containers/modal_container';

const Compose = () => {
  const composerEditor = useAppSelector(selectComposerEditor);
  const useBlueLabComposer =
    composerEditor === 'bluelab' &&
    typeof document !== 'undefined' &&
    document.body.dataset.theme === 'blue-2';

  return (
    <>
      {useBlueLabComposer ? (
        <RedesignComposeForm autoFocus embedded redirectOnSuccess />
      ) : (
        <ComposeFormContainer autoFocus withoutNavigation redirectOnSuccess />
      )}
      <AlertsController />
      <ModalContainer />
      <LoadingBarContainer className='loading-bar' />
    </>
  );
};

export default Compose;
