export type Blue2TextKey =
  | 'profile'
  | 'write'
  | 'trendingFeeds'
  | 'hideTrendsTitle'
  | 'hideTrendsDescription'
  | 'hide';

type Blue2Strings = Record<Blue2TextKey, string>;

const strings: Record<string, Blue2Strings> = {
  en: {
    profile: 'Profile',
    write: 'Write',
    trendingFeeds: 'Trending feeds',
    hideTrendsTitle: 'Hide trending topics?',
    hideTrendsDescription: 'Hide trending topics from this sidebar.',
    hide: 'Hide',
  },
  pt: {
    profile: 'Perfil',
    write: 'Escrever',
    trendingFeeds: 'Feeds em alta',
    hideTrendsTitle: 'Ocultar assuntos em alta?',
    hideTrendsDescription: 'Oculta os assuntos em alta desta barra lateral.',
    hide: 'Ocultar',
  },
  es: {
    profile: 'Perfil',
    write: 'Escribir',
    trendingFeeds: 'Feeds en tendencia',
    hideTrendsTitle: '¿Ocultar temas en tendencia?',
    hideTrendsDescription: 'Oculta los temas en tendencia de esta barra lateral.',
    hide: 'Ocultar',
  },
  fr: {
    profile: 'Profil',
    write: 'Écrire',
    trendingFeeds: 'Fils tendance',
    hideTrendsTitle: 'Masquer les tendances ?',
    hideTrendsDescription: 'Masque les sujets tendance de cette barre latérale.',
    hide: 'Masquer',
  },
  de: {
    profile: 'Profil',
    write: 'Schreiben',
    trendingFeeds: 'Trend-Feeds',
    hideTrendsTitle: 'Trends ausblenden?',
    hideTrendsDescription: 'Blendet Trends in dieser Seitenleiste aus.',
    hide: 'Ausblenden',
  },
  it: {
    profile: 'Profilo',
    write: 'Scrivi',
    trendingFeeds: 'Feed di tendenza',
    hideTrendsTitle: 'Nascondere le tendenze?',
    hideTrendsDescription: 'Nasconde gli argomenti di tendenza da questa barra laterale.',
    hide: 'Nascondi',
  },
  nl: {
    profile: 'Profiel',
    write: 'Schrijven',
    trendingFeeds: 'Trending feeds',
    hideTrendsTitle: 'Trending onderwerpen verbergen?',
    hideTrendsDescription: 'Verbergt trending onderwerpen in deze zijbalk.',
    hide: 'Verbergen',
  },
  pl: {
    profile: 'Profil',
    write: 'Napisz',
    trendingFeeds: 'Popularne kanały',
    hideTrendsTitle: 'Ukryć popularne tematy?',
    hideTrendsDescription: 'Ukrywa popularne tematy na tym pasku bocznym.',
    hide: 'Ukryj',
  },
  tr: {
    profile: 'Profil',
    write: 'Yaz',
    trendingFeeds: 'Gündemdeki akışlar',
    hideTrendsTitle: 'Gündem konuları gizlensin mi?',
    hideTrendsDescription: 'Gündem konularını bu kenar çubuğunda gizler.',
    hide: 'Gizle',
  },
  ru: {
    profile: 'Профиль',
    write: 'Написать',
    trendingFeeds: 'Популярные ленты',
    hideTrendsTitle: 'Скрыть популярные темы?',
    hideTrendsDescription: 'Скрывает популярные темы на этой боковой панели.',
    hide: 'Скрыть',
  },
  ja: {
    profile: 'プロフィール',
    write: '投稿する',
    trendingFeeds: 'トレンドフィード',
    hideTrendsTitle: 'トレンドを非表示にしますか？',
    hideTrendsDescription: 'このサイドバーのトレンドを非表示にします。',
    hide: '非表示',
  },
  ko: {
    profile: '프로필',
    write: '작성',
    trendingFeeds: '인기 피드',
    hideTrendsTitle: '인기 주제를 숨길까요?',
    hideTrendsDescription: '이 사이드바에서 인기 주제를 숨깁니다.',
    hide: '숨기기',
  },
  zh: {
    profile: '个人资料',
    write: '撰写',
    trendingFeeds: '热门动态',
    hideTrendsTitle: '隐藏热门话题？',
    hideTrendsDescription: '在此侧栏中隐藏热门话题。',
    hide: '隐藏',
  },
};

export const blue2Text = (locale: string, key: Blue2TextKey): string => {
  const language = locale.toLowerCase().split(/[-_]/)[0] ?? 'en';
  return (strings[language] ?? strings.en)[key];
};
