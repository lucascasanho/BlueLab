export function getInstanceConfig(env) {
  const baseUrl = String(env.INSTANCE_URL ?? '').replace(/\/$/, '');

  const components = [
    {
      slug: 'website-api',
      name: 'Site e API',
      description: 'Acesso ao site e aos endpoints públicos da instância.',
      monitorType: 'http',
      targetUrl: env.WEBSITE_HEALTH_URL || `${baseUrl}/health`,
      sortOrder: 10,
    },
    {
      slug: 'streaming-api',
      name: 'Atualizações em tempo real',
      description: 'Conexões de streaming usadas pelas timelines.',
      monitorType: 'http',
      targetUrl:
        env.STREAMING_HEALTH_URL || `${baseUrl}/api/v1/streaming/health`,
      sortOrder: 20,
    },
  ];

  if (env.MEDIA_HEALTH_URL) {
    components.push({
      slug: 'media-storage',
      name: 'Arquivos e mídia',
      description: 'Entrega de imagens, vídeos e outros arquivos da instância.',
      monitorType: 'http',
      targetUrl: env.MEDIA_HEALTH_URL,
      sortOrder: 30,
    });
  }

  // Filas só aparecem quando existe um heartbeat real configurado. Exibir um
  // componente sem sinal de saúde produziria um status que não pode ser
  // comprovado externamente.
  if (env.HEARTBEAT_TOKEN) {
    components.push({
      slug: 'background-queues',
      name: 'Tarefas em segundo plano',
      description: 'Processamento de entregas, notificações e mídia.',
      monitorType: 'heartbeat',
      targetUrl: null,
      sortOrder: 40,
    });
  }

  return {
    name: env.INSTANCE_NAME || 'BlueLab',
    baseUrl,
    components,
  };
}
