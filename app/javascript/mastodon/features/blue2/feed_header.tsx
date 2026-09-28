import type React from 'react';

import classes from './feed_header.module.scss';

export const Blue2HomeFeedTitleBar: React.FC<{
  title: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, children }) => (
  <div className={classes.root}>
    <div className={classes.title}>
      <span>{title}</span>
    </div>
    <div className={classes.actions}>{children}</div>
  </div>
);
