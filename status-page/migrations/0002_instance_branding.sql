CREATE TABLE instance_branding (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    name TEXT NOT NULL,
    logo_base64 TEXT NOT NULL,
    logo_content_type TEXT NOT NULL,
    favicon_base64 TEXT NOT NULL,
    favicon_content_type TEXT NOT NULL,
    refreshed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
