export function getInstanceConfig(env) {
  const baseUrl = String(env.INSTANCE_URL ?? '').replace(/\/$/, '');

  return {
    name: env.INSTANCE_NAME || 'BlueLab',
    baseUrl,
    components: [
      {
        slug: 'website-api',
        name: 'Website & API',
        description: 'Site principal, API, banco de dados e cache.',
        monitorType: 'http',
        targetUrl: env.WEBSITE_HEALTH_URL || `${baseUrl}/health`,
        sortOrder: 10,
      },
      {
        slug: 'background-queues',
        name: 'Background queues',
        description: 'Processamento das tarefas em segundo plano.',
        monitorType: 'heartbeat',
        targetUrl: null,
        sortOrder: 20,
      },
      {
        slug: 'media-storage',
        name: 'Media storage',
        description:
          'Disponibilidade de imagens, vídeos e outros arquivos de mídia.',
        monitorType: 'manual',
        targetUrl: null,
        sortOrder: 30,
      },
      {
        slug: 'streaming-api',
        name: 'Streaming API',
        description: 'Atualizações em tempo real e conexões de streaming.',
        monitorType: 'http',
        targetUrl:
          env.STREAMING_HEALTH_URL || `${baseUrl}/api/v1/streaming/health`,
        sortOrder: 40,
      },
    ],
  };
}
