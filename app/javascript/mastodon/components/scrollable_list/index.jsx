import PropTypes from 'prop-types';
import { Children, cloneElement, PureComponent } from 'react';

import { useLocation } from 'react-router-dom';

import { List as ImmutableList } from 'immutable';
import { connect } from 'react-redux';

import { supportsPassiveEvents } from 'detect-passive-events';
import { throttle } from 'lodash';

import RefreshIcon from '@/material-icons/400-24px/refresh.svg?react';
import { ScrollContainer } from 'mastodon/containers/scroll_container';
import pullToRefreshClasses from 'mastodon/features/blue2/pull_to_refresh.module.scss';

import IntersectionObserverArticleContainer from '../../containers/intersection_observer_article_container';
import { attachFullscreenListener, detachFullscreenListener, isFullscreen } from '../../features/ui/util/fullscreen';
import IntersectionObserverWrapper from '../../features/ui/util/intersection_observer_wrapper';

import { LoadMore } from '../load_more';
import { LoadPending } from '../load_pending';
import { LoadingIndicator } from '../loading_indicator';
import { Scrollable, ItemList } from './components';

const MOUSE_IDLE_DELAY = 300;
const TOP_THRESHOLD = 100;
const PULL_REFRESH_THRESHOLD = 72;
const PULL_REFRESH_MAX_DISTANCE = 112;
const PULL_REFRESH_FALLBACK_DELAY = 12000;

const listenerOptions = supportsPassiveEvents ? { passive: true } : false;

/**
 *
 * @param {import('mastodon/store').RootState} state
 * @param {*} props
 */
const mapStateToProps = (state, { scrollKey }) => {
  return {
    preventScroll: scrollKey === state.dropdownMenu.scrollKey,
  };
};

// This component only exists to be able to call useLocation()
const IOArticleContainerWrapper = ({id, index, listLength, intersectionObserverWrapper, trackScroll, scrollKey, children}) => {
  const location = useLocation();

  return (<IntersectionObserverArticleContainer
    id={id}
    index={index}
    listLength={listLength}
    intersectionObserverWrapper={intersectionObserverWrapper}
    saveHeightKey={trackScroll ? `${location.key}:${scrollKey}` : null}
  >
    {children}
  </IntersectionObserverArticleContainer>);
};

IOArticleContainerWrapper.propTypes =  {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  index: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  listLength: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  scrollKey: PropTypes.string.isRequired,
  intersectionObserverWrapper: PropTypes.object.isRequired,
  trackScroll: PropTypes.bool.isRequired,
  children: PropTypes.node,
};

class ScrollableList extends PureComponent {

  static propTypes = {
    scrollKey: PropTypes.string.isRequired,
    onLoadMore: PropTypes.func,
    onLoadPending: PropTypes.func,
    onRefresh: PropTypes.func,
    onScrollToTop: PropTypes.func,
    onScroll: PropTypes.func,
    trackScroll: PropTypes.bool,
    isLoading: PropTypes.bool,
    showLoading: PropTypes.bool,
    hasMore: PropTypes.bool,
    numPending: PropTypes.number,
    prepend: PropTypes.node,
    append: PropTypes.node,
    alwaysPrepend: PropTypes.bool,
    emptyMessage: PropTypes.node,
    children: PropTypes.node,
    bindToDocument: PropTypes.bool,
    preventScroll: PropTypes.bool,
    footer: PropTypes.node,
    className: PropTypes.string,
  };

  static defaultProps = {
    trackScroll: true,
  };

  state = {
    fullscreen: null,
    cachedMediaWidth: 250, // Default media/card width using default Mastodon theme
    pullDistance: 0,
    pullRefreshing: false,
  };

  intersectionObserverWrapper = new IntersectionObserverWrapper();
  pullOrigin = null;
  pullTracking = false;
  pullDistance = 0;
  pullSawLoading = false;
  pullRefreshFallbackTimer = null;
  pullResetTimer = null;
  mounted = false;

  handleScroll = throttle(() => {
    if (this.node) {
      const scrollTop = this.getScrollTop();
      const scrollHeight = this.getScrollHeight();
      const clientHeight = this.getClientHeight();
      const offset = scrollHeight - scrollTop - clientHeight;

      if (scrollTop > 0 && offset < 400 && this.props.onLoadMore && this.props.hasMore && !this.props.isLoading) {
        this.props.onLoadMore();
      }

      if (scrollTop < 100 && this.props.onScrollToTop) {
        this.props.onScrollToTop();
      } else if (this.props.onScroll) {
        this.props.onScroll();
      }

      if (!this.lastScrollWasSynthetic) {
        // If the last scroll wasn't caused by setScrollTop(), assume it was
        // intentional and cancel any pending scroll reset on mouse idle
        this.scrollToTopOnMouseIdle = false;
      }
      this.lastScrollWasSynthetic = false;
    }
  }, 150, {
    trailing: true,
  });

  mouseIdleTimer = null;
  mouseMovedRecently = false;
  lastScrollWasSynthetic = false;
  scrollToTopOnMouseIdle = false;

  _getScrollingElement = () => {
    if (this.props.bindToDocument) {
      return (document.scrollingElement || document.body);
    } else {
      return this.node;
    }
  };

  setScrollTop = newScrollTop => {
    if (this.getScrollTop() !== newScrollTop) {
      this.lastScrollWasSynthetic = true;

      this._getScrollingElement().scrollTop = newScrollTop;
    }
  };

  clearMouseIdleTimer = () => {
    if (this.mouseIdleTimer === null) {
      return;
    }

    clearTimeout(this.mouseIdleTimer);
    this.mouseIdleTimer = null;
  };

  handleMouseMove = throttle(() => {
    // As long as the mouse keeps moving, clear and restart the idle timer.
    this.clearMouseIdleTimer();
    this.mouseIdleTimer = setTimeout(this.handleMouseIdle, MOUSE_IDLE_DELAY);

    if (!this.mouseMovedRecently && this.getScrollTop() === 0) {
      // Only set if we just started moving and are scrolled to the top.
      this.scrollToTopOnMouseIdle = true;
    }

    // Save setting this flag for last, so we can do the comparison above.
    this.mouseMovedRecently = true;
  }, MOUSE_IDLE_DELAY / 2);

  handleWheel = throttle(() => {
    this.scrollToTopOnMouseIdle = false;
  }, 150, {
    trailing: true,
  });

  handleMouseIdle = () => {
    if (this.scrollToTopOnMouseIdle && !this.props.preventScroll) {
      this.setScrollTop(0);
    }

    this.mouseMovedRecently = false;
    this.scrollToTopOnMouseIdle = false;
  };

  componentDidMount () {
    this.mounted = true;
    this.attachScrollListener();
    this.attachIntersectionObserver();

    attachFullscreenListener(this.onFullScreenChange);

    // Handle initial scroll position
    this.handleScroll();
  }

  getScrollPosition = () => {
    if (this.node && (this.getScrollTop() > 0 || this.mouseMovedRecently)) {
      return { height: this.getScrollHeight(), top: this.getScrollTop() };
    } else {
      return null;
    }
  };

  getScrollTop = () => {
    return this._getScrollingElement().scrollTop;
  };

  getScrollHeight = () => {
    return this._getScrollingElement().scrollHeight;
  };

  getClientHeight = () => {
    return this._getScrollingElement().clientHeight;
  };

  updateScrollBottom = (snapshot) => {
    const newScrollTop = this.getScrollHeight() - snapshot;

    this.setScrollTop(newScrollTop);
  };

  getVisualScrollAnchor = () => {
    const viewportTop = this.props.bindToDocument ? 0 : this.node.getBoundingClientRect().top;
    const items = this.node.querySelectorAll('.item-list > article[data-id]');

    for (const item of items) {
      const { top, bottom } = item.getBoundingClientRect();

      if (bottom > viewportTop) {
        return { node: item, top };
      }
    }

    return null;
  };

  getSnapshotBeforeUpdate (prevProps) {
    const someItemInserted = Children.count(prevProps.children) > 0 &&
      Children.count(prevProps.children) < Children.count(this.props.children) &&
      this.getFirstChildKey(prevProps) !== this.getFirstChildKey(this.props);
    const pendingChanged = (prevProps.numPending > 0) !== (this.props.numPending > 0);

    if (pendingChanged || someItemInserted && (this.getScrollTop() >= TOP_THRESHOLD || this.props.preventScroll)) {
      return {
        anchor: this.getVisualScrollAnchor(),
        bottom: this.getScrollHeight() - this.getScrollTop(),
      };
    } else {
      return null;
    }
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    if (snapshot !== null) {
      const { anchor, bottom } = snapshot;

      if (anchor && this.node.contains(anchor.node)) {
        const offset = anchor.node.getBoundingClientRect().top - anchor.top;
        this.setScrollTop(this.getScrollTop() + offset);
      } else {
        // Keep the previous height-based behavior as a fallback when there is
        // no stable rendered item to use as a visual anchor.
        this.setScrollTop(this.getScrollHeight() - bottom);
      }
    }

    if (this.state.pullRefreshing) {
      if (!prevProps.isLoading && this.props.isLoading) {
        this.pullSawLoading = true;
      }

      if (this.pullSawLoading && prevProps.isLoading && !this.props.isLoading) {
        this.finishPullRefresh();
      }
    }
  }

  cacheMediaWidth = (width) => {
    if (width && this.state.cachedMediaWidth !== width) {
      this.setState({ cachedMediaWidth: width });
    }
  };

  componentWillUnmount () {
    this.mounted = false;
    this.clearMouseIdleTimer();
    this.detachScrollListener();
    this.detachIntersectionObserver();
    clearTimeout(this.pullRefreshFallbackTimer);
    clearTimeout(this.pullResetTimer);

    detachFullscreenListener(this.onFullScreenChange);
  }

  onFullScreenChange = () => {
    this.setState({ fullscreen: isFullscreen() });
  };

  attachIntersectionObserver () {
    let nodeOptions = {
      root: this.node,
      rootMargin: '300% 0px',
    };

    this.intersectionObserverWrapper
      .connect(this.props.bindToDocument ? {} : nodeOptions);
  }

  detachIntersectionObserver () {
    this.intersectionObserverWrapper.disconnect();
  }

  attachScrollListener () {
    if (this.props.bindToDocument) {
      document.addEventListener('scroll', this.handleScroll);
      document.addEventListener('wheel', this.handleWheel,  listenerOptions);
    } else {
      this.node.addEventListener('scroll', this.handleScroll);
      this.node.addEventListener('wheel', this.handleWheel, listenerOptions);
    }
  }

  detachScrollListener () {
    if (this.props.bindToDocument) {
      document.removeEventListener('scroll', this.handleScroll);
      document.removeEventListener('wheel', this.handleWheel, listenerOptions);
    } else if (this.node) {
      this.node.removeEventListener('scroll', this.handleScroll);
      this.node.removeEventListener('wheel', this.handleWheel, listenerOptions);
    }
  }

  getFirstChildKey (props) {
    const { children } = props;
    let firstChild     = children;

    if (children instanceof ImmutableList) {
      firstChild = children.get(0);
    } else if (Array.isArray(children)) {
      firstChild = children[0];
    }

    return firstChild && firstChild.key;
  }

  setRef = (c) => {
    this.node = c;
  };

  isBlueLabPullToRefreshEnabled = () => {
    return Boolean(
      this.props.onRefresh &&
      typeof document !== 'undefined' &&
      document.body.dataset.theme === 'blue-2',
    );
  };

  resetPullGesture = () => {
    this.pullOrigin = null;
    this.pullTracking = false;
    this.pullDistance = 0;

    if (this.mounted && this.state.pullDistance !== 0) {
      this.setState({ pullDistance: 0 });
    }
  };

  finishPullRefresh = () => {
    clearTimeout(this.pullRefreshFallbackTimer);
    clearTimeout(this.pullResetTimer);
    this.pullRefreshFallbackTimer = null;
    this.pullSawLoading = false;

    this.pullResetTimer = setTimeout(() => {
      if (!this.mounted) return;

      this.pullDistance = 0;
      this.setState({ pullDistance: 0, pullRefreshing: false });
    }, 180);
  };

  handlePullStart = event => {
    if (
      !this.isBlueLabPullToRefreshEnabled() ||
      this.state.pullRefreshing ||
      this.props.isLoading ||
      event.touches.length !== 1 ||
      this.getScrollTop() > 0
    ) {
      return;
    }

    const touch = event.touches[0];
    this.pullOrigin = { x: touch.clientX, y: touch.clientY };
    this.pullTracking = true;
    this.pullDistance = 0;
  };

  handlePullMove = event => {
    if (!this.pullTracking || !this.pullOrigin || event.touches.length !== 1) {
      return;
    }

    if (this.getScrollTop() > 0) {
      this.resetPullGesture();
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.pullOrigin.x;
    const deltaY = touch.clientY - this.pullOrigin.y;

    if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
      this.resetPullGesture();
      return;
    }

    if (deltaY < 8) return;

    if (event.cancelable) {
      event.preventDefault();
    }

    const distance = Math.min(
      PULL_REFRESH_MAX_DISTANCE,
      Math.round(deltaY * 0.52),
    );
    this.pullDistance = distance;
    this.setState({ pullDistance: distance });
  };

  handlePullEnd = () => {
    if (!this.pullTracking) return;

    const shouldRefresh = this.pullDistance >= PULL_REFRESH_THRESHOLD;
    this.pullOrigin = null;
    this.pullTracking = false;

    if (!shouldRefresh) {
      this.resetPullGesture();
      return;
    }

    this.pullSawLoading = false;
    this.pullDistance = PULL_REFRESH_THRESHOLD;
    this.setState({
      pullDistance: PULL_REFRESH_THRESHOLD,
      pullRefreshing: true,
    });

    clearTimeout(this.pullRefreshFallbackTimer);
    this.pullRefreshFallbackTimer = setTimeout(
      this.finishPullRefresh,
      PULL_REFRESH_FALLBACK_DELAY,
    );

    try {
      this.props.onRefresh();
    } catch {
      this.finishPullRefresh();
    }
  };

  handlePullCancel = () => {
    if (!this.state.pullRefreshing) {
      this.resetPullGesture();
    }
  };

  renderPullRefreshIndicator = () => {
    const { pullDistance, pullRefreshing } = this.state;

    if (!pullRefreshing && pullDistance <= 0) return null;

    return (
      <div
        className={pullToRefreshClasses.root}
        data-ready={pullDistance >= PULL_REFRESH_THRESHOLD ? 'true' : 'false'}
        data-refreshing={pullRefreshing ? 'true' : 'false'}
        style={{ '--blue2-pull-distance': `${pullDistance}px` }}
        aria-hidden='true'
      >
        <span className={pullToRefreshClasses.indicator}>
          <RefreshIcon className={pullToRefreshClasses.icon} />
        </span>
      </div>
    );
  };

  handleLoadMore = e => {
    e.preventDefault();
    this.props.onLoadMore();
  };

  handleLoadPending = e => {
    e.preventDefault();
    this.props.onLoadPending();
    // Prevent the weird scroll-jumping behavior, as we explicitly don't want to
    // scroll to top, and we know the scroll height is going to change
    this.scrollToTopOnMouseIdle = false;
    this.lastScrollWasSynthetic = false;
    this.clearMouseIdleTimer();
    this.mouseIdleTimer = setTimeout(this.handleMouseIdle, MOUSE_IDLE_DELAY);
    this.mouseMovedRecently = true;
  };

  render () {
    const { children, scrollKey, className, trackScroll, showLoading, isLoading, hasMore, numPending, prepend, alwaysPrepend, append, footer, emptyMessage, onLoadMore } = this.props;
    const { fullscreen } = this.state;
    const childrenCount = Children.count(children);
    const pullToRefreshEnabled = this.isBlueLabPullToRefreshEnabled();
    const pullHandlers = pullToRefreshEnabled ? {
      onTouchStart: this.handlePullStart,
      onTouchMove: this.handlePullMove,
      onTouchEnd: this.handlePullEnd,
      onTouchCancel: this.handlePullCancel,
    } : {};
    const pullRefreshIndicator = pullToRefreshEnabled
      ? this.renderPullRefreshIndicator()
      : null;

    const loadMore     = (hasMore && onLoadMore) ? <LoadMore visible={!isLoading} onClick={this.handleLoadMore} /> : null;
    const loadPending  = (numPending > 0) ? <LoadPending count={numPending} onClick={this.handleLoadPending} /> : null;
    let scrollableArea = null;

    if (showLoading) {
      scrollableArea = (
        <Scrollable ref={this.setRef} {...pullHandlers}>
          {pullRefreshIndicator}
          {prepend}

          <ItemList isLoading />

          {footer}
        </Scrollable>
      );
    } else if (isLoading || childrenCount > 0 || numPending > 0 || hasMore || !emptyMessage) {
      scrollableArea = (
        <Scrollable fullscreen={fullscreen} ref={this.setRef} onMouseMove={this.handleMouseMove} {...pullHandlers}>
          {pullRefreshIndicator}
          {prepend}

          <ItemList className={className}>
            {loadPending}

            {Children.map(this.props.children, (child, index) => (
              <IOArticleContainerWrapper
                key={child.key}
                id={child.key}
                index={index}
                listLength={childrenCount}
                intersectionObserverWrapper={this.intersectionObserverWrapper}
                trackScroll={trackScroll}
                scrollKey={scrollKey}
              >
                {cloneElement(child, {
                  getScrollPosition: this.getScrollPosition,
                  updateScrollBottom: this.updateScrollBottom,
                  cachedMediaWidth: this.state.cachedMediaWidth,
                  cacheMediaWidth: this.cacheMediaWidth,
                })}
              </IOArticleContainerWrapper>
            ))}

            {loadMore}

            {!hasMore && append}
          </ItemList>

          {footer}
        </Scrollable>
      );
    } else {
      scrollableArea = (
        <Scrollable fullscreen={fullscreen} ref={this.setRef} {...pullHandlers}>
          {pullRefreshIndicator}
          {alwaysPrepend && prepend}

          <div className='empty-column-indicator'>
            <span>{emptyMessage}</span>
          </div>

          {footer}
        </Scrollable>
      );
    }

    if (trackScroll) {
      return (
        <ScrollContainer scrollKey={scrollKey} childRef={this.setRef}>
          {scrollableArea}
        </ScrollContainer>
      );
    } else {
      return scrollableArea;
    }
  }

}

export { ScrollableList as ScrollableListForTest };

export default connect(mapStateToProps, null, null, { forwardRef: true })(ScrollableList);
