import { accountStatPaths } from './navigation_bar';

describe('accountStatPaths', () => {
  it('keeps every compose account statistic inside the local SPA', () => {
    expect(accountStatPaths('alice')).toEqual({
      posts: '/@alice',
      following: '/@alice/following',
      followers: '/@alice/followers',
    });
  });
});
