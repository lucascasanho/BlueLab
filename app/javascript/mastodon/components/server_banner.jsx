import PropTypes from 'prop-types';
import { PureComponent } from 'react';

import { FormattedMessage, defineMessages } from 'react-intl';

import { NavLink } from 'react-router-dom';

import { connect } from 'react-redux';

import { fetchServer } from 'mastodon/actions/server';
import { ServerHeroImage } from 'mastodon/components/server_hero_image';
import { Skeleton } from 'mastodon/components/skeleton';
import { domain } from 'mastodon/initial_state';

import { injectIntl } from './intl';

const messages = defineMessages({
  aboutThisServer: { id: 'server_banner.more_about_this_server', defaultMessage: 'More about this server'},
});

const mapStateToProps = state => ({
  server: state.server.server,
});

class ServerBanner extends PureComponent {

  static propTypes = {
    server: PropTypes.object,
    dispatch: PropTypes.func,
    intl: PropTypes.object,
  };

  componentDidMount () {
    const { dispatch } = this.props;
    dispatch(fetchServer());
  }

  render () {
    const { server, intl } = this.props;
    const isLoading = server.isLoading;

    return (
      <div className='server-banner'>
        <div className='server-banner__introduction'>
          <FormattedMessage id='server_banner.is_one_of_many' defaultMessage='{domain} is one of the many independent Mastodon servers you can use to participate in the fediverse.' values={{ domain: <strong>{domain}</strong>, mastodon: <a href='https://joinmastodon.org' target='_blank' rel='noopener'>Mastodon</a> }} />
        </div>

        <NavLink to='/about'>
          <ServerHeroImage
            blurhash={server.item?.thumbnail.blurhash}
            src={server.item?.thumbnail.url}
            alt={intl.formatMessage(messages.aboutThisServer)}
            className='server-banner__hero'
          />
        </NavLink>

        <div className='server-banner__description'>
          {isLoading ? (
            <>
              <Skeleton width='100%' />
              <br />
              <Skeleton width='100%' />
              <br />
              <Skeleton width='70%' />
            </>
          ) : server.item?.description}
        </div>

      </div>
    );
  }

}

export default connect(mapStateToProps)(injectIntl(ServerBanner));
