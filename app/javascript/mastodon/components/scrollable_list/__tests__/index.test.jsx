import { createElement } from 'react';

import { ScrollableListForTest } from '../index';

const status = (id) => createElement('div', { key: id });

const setRect = (node, top, bottom) => {
  node.getBoundingClientRect = () => ({ top, bottom });
};

const buildList = ({ scrollTop = 500, props = {} } = {}) => {
  const node = document.createElement('div');
  const itemList = document.createElement('div');
  itemList.className = 'item-list';
  node.appendChild(itemList);
  document.body.appendChild(node);

  Object.defineProperties(node, {
    scrollTop: { value: scrollTop, writable: true },
    scrollHeight: { value: 2_000, writable: true },
  });
  setRect(node, 0, 600);

  const articles = ['a', 'b', 'c'].map((id) => {
    const article = document.createElement('article');
    article.dataset.id = id;
    itemList.appendChild(article);
    return article;
  });

  setRect(articles[0], -200, -20);
  setRect(articles[1], 80, 280);
  setRect(articles[2], 280, 480);

  const list = new ScrollableListForTest({
    bindToDocument: false,
    children: ['x', 'y', 'z', 'a', 'b', 'c'].map(status),
    ...props,
  });
  list.node = node;

  return { list, node, articles };
};

const makeStateUpdatesSynchronous = (list) => {
  list.setState = (update) => {
    const nextState =
      typeof update === 'function'
        ? update(list.state, list.props)
        : update;
    list.state = { ...list.state, ...nextState };
  };
};

afterEach(() => {
  document.body.replaceChildren();
  delete document.body.dataset.theme;
});

describe('ScrollableList visual scroll anchoring', () => {
  test('keeps the first visible status fixed when a batch is prepended', () => {
    const { list, node, articles } = buildList();
    const snapshot = list.getSnapshotBeforeUpdate({
      children: ['a', 'b', 'c'].map(status),
      numPending: 0,
    });

    node.scrollHeight = 2_600;
    setRect(articles[1], 680, 880);
    list.componentDidUpdate(null, null, snapshot);

    expect(node.scrollTop).toBe(1_100);
  });

  test('does not compensate live insertions near the top', () => {
    const { list } = buildList({ scrollTop: 50 });

    const snapshot = list.getSnapshotBeforeUpdate({
      children: ['a', 'b', 'c'].map(status),
      numPending: 0,
    });

    expect(snapshot).toBeNull();
  });

  test('does not fight native anchoring when the item is already stable', () => {
    const { list, node } = buildList();
    const snapshot = list.getSnapshotBeforeUpdate({
      children: ['a', 'b', 'c'].map(status),
      numPending: 0,
    });

    node.scrollHeight = 2_600;
    list.componentDidUpdate(null, null, snapshot);

    expect(node.scrollTop).toBe(500);
  });

  test('only changes the scroll container owned by the updated column', () => {
    const first = buildList();
    const second = buildList({ scrollTop: 900 });
    const snapshot = first.list.getSnapshotBeforeUpdate({
      children: ['a', 'b', 'c'].map(status),
      numPending: 0,
    });

    setRect(first.articles[1], 380, 580);
    first.list.componentDidUpdate(null, null, snapshot);

    expect(first.node.scrollTop).toBe(800);
    expect(second.node.scrollTop).toBe(900);
  });
});

describe('BlueLab pull to refresh', () => {
  test('is enabled only for BlueLab feeds that provide a refresh callback', () => {
    const { list } = buildList({
      scrollTop: 0,
      props: { onRefresh: () => {} },
    });

    document.body.dataset.theme = 'blue-2';
    expect(list.isBlueLabPullToRefreshEnabled()).toBe(true);

    document.body.dataset.theme = 'mastodon';
    expect(list.isBlueLabPullToRefreshEnabled()).toBe(false);

    const { list: noRefreshList } = buildList({ scrollTop: 0 });
    document.body.dataset.theme = 'blue-2';
    expect(noRefreshList.isBlueLabPullToRefreshEnabled()).toBe(false);
  });

  test('refreshes after a deliberate downward pull from the top', () => {
    let refreshCount = 0;
    let prevented = false;
    const { list } = buildList({
      scrollTop: 0,
      props: {
        isLoading: false,
        onRefresh: () => {
          refreshCount += 1;
        },
      },
    });
    makeStateUpdatesSynchronous(list);
    document.body.dataset.theme = 'blue-2';

    list.handlePullStart({
      touches: [{ clientX: 20, clientY: 20 }],
    });
    list.handlePullMove({
      touches: [{ clientX: 22, clientY: 180 }],
      cancelable: true,
      preventDefault: () => {
        prevented = true;
      },
    });
    list.handlePullEnd();

    expect(prevented).toBe(true);
    expect(refreshCount).toBe(1);
    clearTimeout(list.pullRefreshFallbackTimer);
    clearTimeout(list.pullResetTimer);
  });

  test('does not refresh for a mostly horizontal swipe', () => {
    let refreshCount = 0;
    const { list } = buildList({
      scrollTop: 0,
      props: {
        isLoading: false,
        onRefresh: () => {
          refreshCount += 1;
        },
      },
    });
    makeStateUpdatesSynchronous(list);
    document.body.dataset.theme = 'blue-2';

    list.handlePullStart({
      touches: [{ clientX: 20, clientY: 20 }],
    });
    list.handlePullMove({
      touches: [{ clientX: 140, clientY: 45 }],
      cancelable: true,
      preventDefault: () => {},
    });
    list.handlePullEnd();

    expect(refreshCount).toBe(0);
  });
});
