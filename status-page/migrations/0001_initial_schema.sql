CREATE TABLE components (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    monitor_type TEXT NOT NULL
        CHECK (monitor_type IN ('http', 'heartbeat', 'manual')),
    target_url TEXT,
    current_status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (
            current_status IN (
                'unknown',
                'operational',
                'degraded',
                'partial_outage',
                'major_outage',
                'maintenance'
            )
        ),
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1
        CHECK (enabled IN (0, 1)),
    last_checked_at TEXT,
    last_ok_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE checks (
    id INTEGER PRIMARY KEY,
    component_id INTEGER NOT NULL,
    status TEXT NOT NULL
        CHECK (
            status IN (
                'unknown',
                'operational',
                'degraded',
                'partial_outage',
                'major_outage',
                'maintenance'
            )
        ),
    http_status INTEGER,
    response_ms INTEGER,
    message TEXT,
    checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id)
        REFERENCES components(id)
        ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_checks_component_time
ON checks(component_id, checked_at);

CREATE INDEX idx_checks_time
ON checks(checked_at);

CREATE TABLE daily_stats (
    component_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    total_checks INTEGER NOT NULL DEFAULT 0 CHECK (total_checks >= 0),
    up_checks INTEGER NOT NULL DEFAULT 0 CHECK (up_checks >= 0),
    degraded_checks INTEGER NOT NULL DEFAULT 0 CHECK (degraded_checks >= 0),
    down_checks INTEGER NOT NULL DEFAULT 0 CHECK (down_checks >= 0),
    PRIMARY KEY (component_id, day),
    FOREIGN KEY (component_id)
        REFERENCES components(id)
        ON DELETE CASCADE
) STRICT;

CREATE TABLE incidents (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'investigating'
        CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    impact TEXT NOT NULL DEFAULT 'minor'
        CHECK (impact IN ('none', 'minor', 'major', 'critical')),
    summary TEXT NOT NULL DEFAULT '',
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX idx_incidents_started
ON incidents(started_at);

CREATE TABLE incident_updates (
    id INTEGER PRIMARY KEY,
    incident_id INTEGER NOT NULL,
    status TEXT NOT NULL
        CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_incident_updates_incident
ON incident_updates(incident_id, created_at);

CREATE TABLE incident_components (
    incident_id INTEGER NOT NULL,
    component_id INTEGER NOT NULL,
    PRIMARY KEY (incident_id, component_id),
    FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,
    FOREIGN KEY (component_id)
        REFERENCES components(id)
        ON DELETE CASCADE
) STRICT;

INSERT INTO components (
    slug,
    name,
    description,
    monitor_type,
    target_url,
    current_status,
    sort_order
)
VALUES
(
    'website-api',
    'Website & API',
    'Site principal, API, banco de dados e cache.',
    'http',
    NULL,
    'unknown',
    10
),
(
    'background-queues',
    'Background queues',
    'Processamento das tarefas em segundo plano.',
    'heartbeat',
    NULL,
    'unknown',
    20
),
(
    'media-storage',
    'Media storage',
    'Disponibilidade de imagens, vídeos e outros arquivos de mídia.',
    'manual',
    NULL,
    'unknown',
    30
),
(
    'streaming-api',
    'Streaming API',
    'Atualizações em tempo real e conexões de streaming.',
    'http',
    NULL,
    'unknown',
    40
);
