import { connect } from 'react-redux';

import { makeGetAccount } from '../../../../selectors';
import AutosuggestAccount from '../components/autosuggest_account';

const makeMapStateToProps = () => {
  const getAccount = makeGetAccount();

  return (state, { id }) => ({
    account: getAccount(state, id),
  });
};

export default connect(makeMapStateToProps)(AutosuggestAccount);
