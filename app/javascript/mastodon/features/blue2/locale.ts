export type Blue2TextKey =
  | 'profile'
  | 'write'
  | 'trendingFeeds'
  | 'federation'
  | 'global'
  | 'haveAccount'
  | 'hideTrendsTitle'
  | 'hideTrendsDescription'
  | 'hide'
  | 'basedOnMastodon'
  | 'fediverseFeeds'
  | 'customFeeds'
  | 'createFeed'
  | 'customFeedsEmpty'
  | 'inboxEmpty'
  | 'sayHello'
  | 'newConversation';

type Blue2Strings = Record<Blue2TextKey, string>;

const strings: Record<string, Blue2Strings> = {
  en: {
    profile: 'Profile', write: 'Write', trendingFeeds: 'Trending feeds', federation: 'Federation', global: 'Global',
    haveAccount: 'Already have an account?', hideTrendsTitle: 'Hide trending topics?',
    hideTrendsDescription: 'Hide trending topics from this sidebar.', hide: 'Hide',
    basedOnMastodon: 'Based on Mastodon', fediverseFeeds: 'Fediverse feeds', customFeeds: 'Custom feeds',
    createFeed: 'Create feed', customFeedsEmpty: 'You have no custom feeds yet.', inboxEmpty: 'Empty inbox',
    sayHello: 'Say hello to someone', newConversation: 'New conversation',
  },
  pt: {
    profile: 'Perfil', write: 'Escrever', trendingFeeds: 'Feeds em alta', federation: 'Federação', global: 'Global',
    haveAccount: 'Já tem uma conta?', hideTrendsTitle: 'Ocultar assuntos em alta?',
    hideTrendsDescription: 'Oculta os assuntos em alta desta barra lateral.', hide: 'Ocultar',
    basedOnMastodon: 'Baseado no Mastodon', fediverseFeeds: 'Feeds do Fediverso', customFeeds: 'Feeds personalizados',
    createFeed: 'Criar feed', customFeedsEmpty: 'Você ainda não tem feeds personalizados.', inboxEmpty: 'Caixa de entrada vazia',
    sayHello: 'Diga olá para alguém', newConversation: 'Nova conversa',
  },
  es: {
    profile: 'Perfil', write: 'Escribir', trendingFeeds: 'Feeds en tendencia', federation: 'Federación', global: 'Global',
    haveAccount: '¿Ya tienes una cuenta?', hideTrendsTitle: '¿Ocultar temas en tendencia?',
    hideTrendsDescription: 'Oculta los temas en tendencia de esta barra lateral.', hide: 'Ocultar',
    basedOnMastodon: 'Basado en Mastodon', fediverseFeeds: 'Feeds del Fediverso', customFeeds: 'Feeds personalizados',
    createFeed: 'Crear feed', customFeedsEmpty: 'Aún no tienes feeds personalizados.', inboxEmpty: 'Bandeja de entrada vacía',
    sayHello: 'Saluda a alguien', newConversation: 'Nueva conversación',
  },
  fr: {
    profile: 'Profil', write: 'Écrire', trendingFeeds: 'Fils tendance', federation: 'Fédération', global: 'Global',
    haveAccount: 'Vous avez déjà un compte ?', hideTrendsTitle: 'Masquer les tendances ?',
    hideTrendsDescription: 'Masque les sujets tendance de cette barre latérale.', hide: 'Masquer',
    basedOnMastodon: 'Basé sur Mastodon', fediverseFeeds: 'Fils du Fédiverse', customFeeds: 'Fils personnalisés',
    createFeed: 'Créer un fil', customFeedsEmpty: 'Vous n’avez pas encore de fils personnalisés.', inboxEmpty: 'Boîte de réception vide',
    sayHello: 'Dites bonjour à quelqu’un', newConversation: 'Nouvelle conversation',
  },
  de: {
    profile: 'Profil', write: 'Schreiben', trendingFeeds: 'Trend-Feeds', federation: 'Föderation', global: 'Global',
    haveAccount: 'Du hast bereits ein Konto?', hideTrendsTitle: 'Trends ausblenden?',
    hideTrendsDescription: 'Blendet Trends in dieser Seitenleiste aus.', hide: 'Ausblenden',
    basedOnMastodon: 'Basiert auf Mastodon', fediverseFeeds: 'Fediverse-Feeds', customFeeds: 'Eigene Feeds',
    createFeed: 'Feed erstellen', customFeedsEmpty: 'Du hast noch keine eigenen Feeds.', inboxEmpty: 'Posteingang leer',
    sayHello: 'Sag jemandem Hallo', newConversation: 'Neue Unterhaltung',
  },
  it: {
    profile: 'Profilo', write: 'Scrivi', trendingFeeds: 'Feed di tendenza', federation: 'Federazione', global: 'Globale',
    haveAccount: 'Hai già un account?', hideTrendsTitle: 'Nascondere le tendenze?',
    hideTrendsDescription: 'Nasconde gli argomenti di tendenza da questa barra laterale.', hide: 'Nascondi',
    basedOnMastodon: 'Basato su Mastodon', fediverseFeeds: 'Feed del Fediverso', customFeeds: 'Feed personalizzati',
    createFeed: 'Crea feed', customFeedsEmpty: 'Non hai ancora feed personalizzati.', inboxEmpty: 'Posta in arrivo vuota',
    sayHello: 'Saluta qualcuno', newConversation: 'Nuova conversazione',
  },
  nl: {
    profile: 'Profiel', write: 'Schrijven', trendingFeeds: 'Trending feeds', federation: 'Federatie', global: 'Globaal',
    haveAccount: 'Heb je al een account?', hideTrendsTitle: 'Trending onderwerpen verbergen?',
    hideTrendsDescription: 'Verbergt trending onderwerpen in deze zijbalk.', hide: 'Verbergen',
    basedOnMastodon: 'Gebaseerd op Mastodon', fediverseFeeds: 'Fediverse-feeds', customFeeds: 'Aangepaste feeds',
    createFeed: 'Feed maken', customFeedsEmpty: 'Je hebt nog geen aangepaste feeds.', inboxEmpty: 'Postvak is leeg',
    sayHello: 'Zeg iemand hallo', newConversation: 'Nieuw gesprek',
  },
  pl: {
    profile: 'Profil', write: 'Napisz', trendingFeeds: 'Popularne kanały', federation: 'Federacja', global: 'Globalny',
    haveAccount: 'Masz już konto?', hideTrendsTitle: 'Ukryć popularne tematy?',
    hideTrendsDescription: 'Ukrywa popularne tematy na tym pasku bocznym.', hide: 'Ukryj',
    basedOnMastodon: 'Oparte na Mastodonie', fediverseFeeds: 'Kanały Fediwersum', customFeeds: 'Własne kanały',
    createFeed: 'Utwórz kanał', customFeedsEmpty: 'Nie masz jeszcze własnych kanałów.', inboxEmpty: 'Pusta skrzynka odbiorcza',
    sayHello: 'Przywitaj się z kimś', newConversation: 'Nowa rozmowa',
  },
  tr: {
    profile: 'Profil', write: 'Yaz', trendingFeeds: 'Gündemdeki akışlar', federation: 'Federasyon', global: 'Global',
    haveAccount: 'Zaten bir hesabın var mı?', hideTrendsTitle: 'Gündem konuları gizlensin mi?',
    hideTrendsDescription: 'Gündem konularını bu kenar çubuğunda gizler.', hide: 'Gizle',
    basedOnMastodon: 'Mastodon tabanlı', fediverseFeeds: 'Fediverse akışları', customFeeds: 'Özel akışlar',
    createFeed: 'Akış oluştur', customFeedsEmpty: 'Henüz özel akışın yok.', inboxEmpty: 'Gelen kutusu boş',
    sayHello: 'Birine merhaba de', newConversation: 'Yeni konuşma',
  },
  ru: {
    profile: 'Профиль', write: 'Написать', trendingFeeds: 'Популярные ленты', federation: 'Федерация', global: 'Глобальная',
    haveAccount: 'Уже есть аккаунт?', hideTrendsTitle: 'Скрыть популярные темы?',
    hideTrendsDescription: 'Скрывает популярные темы на этой боковой панели.', hide: 'Скрыть',
    basedOnMastodon: 'На основе Mastodon', fediverseFeeds: 'Ленты Федиверса', customFeeds: 'Пользовательские ленты',
    createFeed: 'Создать ленту', customFeedsEmpty: 'У вас пока нет пользовательских лент.', inboxEmpty: 'Входящие пусты',
    sayHello: 'Поздоровайтесь с кем-нибудь', newConversation: 'Новый разговор',
  },
  ja: {
    profile: 'プロフィール', write: '投稿する', trendingFeeds: 'トレンドフィード', federation: '連合', global: 'グローバル',
    haveAccount: 'すでにアカウントをお持ちですか？', hideTrendsTitle: 'トレンドを非表示にしますか？',
    hideTrendsDescription: 'このサイドバーのトレンドを非表示にします。', hide: '非表示',
    basedOnMastodon: 'Mastodon ベース', fediverseFeeds: 'Fediverse フィード', customFeeds: 'カスタムフィード',
    createFeed: 'フィードを作成', customFeedsEmpty: 'カスタムフィードはまだありません。', inboxEmpty: '受信トレイは空です',
    sayHello: '誰かに挨拶しましょう', newConversation: '新しい会話',
  },
  ko: {
    profile: '프로필', write: '작성', trendingFeeds: '인기 피드', federation: '연합', global: '글로벌',
    haveAccount: '이미 계정이 있나요?', hideTrendsTitle: '인기 주제를 숨길까요?',
    hideTrendsDescription: '이 사이드바에서 인기 주제를 숨깁니다.', hide: '숨기기',
    basedOnMastodon: 'Mastodon 기반', fediverseFeeds: 'Fediverse 피드', customFeeds: '맞춤 피드',
    createFeed: '피드 만들기', customFeedsEmpty: '아직 맞춤 피드가 없습니다.', inboxEmpty: '받은 편지함이 비어 있습니다',
    sayHello: '누군가에게 인사해 보세요', newConversation: '새 대화',
  },
  zh: {
    profile: '个人资料', write: '撰写', trendingFeeds: '热门动态', federation: '联邦', global: '全局',
    haveAccount: '已经有账号了？', hideTrendsTitle: '隐藏热门话题？',
    hideTrendsDescription: '在此侧栏中隐藏热门话题。', hide: '隐藏',
    basedOnMastodon: '基于 Mastodon', fediverseFeeds: '联邦宇宙动态', customFeeds: '自定义动态',
    createFeed: '创建动态', customFeedsEmpty: '你还没有自定义动态。', inboxEmpty: '收件箱为空',
    sayHello: '向某人打个招呼', newConversation: '新对话',
  },
};

export const blue2Text = (locale: string, key: Blue2TextKey): string => {
  const language = locale.toLowerCase().split(/[-_]/)[0] ?? 'en';
  const fallbackStrings = strings.en;

  if (!fallbackStrings) {
    throw new Error('BLUE 2.0 English locale fallback is missing');
  }

  return (strings[language] ?? fallbackStrings)[key];
};
