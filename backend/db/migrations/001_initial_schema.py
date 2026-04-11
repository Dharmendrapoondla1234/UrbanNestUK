"""Initial schema — properties, users, favorites, alerts

Revision ID: 001
Revises: 
Create Date: 2025-01-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'properties',
        sa.Column('id',              UUID(as_uuid=False), primary_key=True),
        sa.Column('country',         sa.String(50),  nullable=False),
        sa.Column('city',            sa.String(100), nullable=False),
        sa.Column('area',            sa.String(200), nullable=False),
        sa.Column('postcode',        sa.String(20)),
        sa.Column('address',         sa.Text),
        sa.Column('lat',             sa.Float),
        sa.Column('lng',             sa.Float),
        sa.Column('title',           sa.Text, nullable=False),
        sa.Column('description',     sa.Text),
        sa.Column('property_type',   sa.String(50)),
        sa.Column('price',           sa.BigInteger, nullable=False),
        sa.Column('currency',        sa.String(5),  nullable=False),
        sa.Column('price_display',   sa.String(50)),
        sa.Column('area_sqft',       sa.Integer),
        sa.Column('bedrooms',        sa.SmallInteger),
        sa.Column('bathrooms',       sa.SmallInteger),
        sa.Column('floor',           sa.String(20)),
        sa.Column('furnishing',      sa.String(30)),
        sa.Column('tenure',          sa.String(30)),
        sa.Column('epc_rating',      sa.String(2)),
        sa.Column('availability',    sa.String(50)),
        sa.Column('available_from',  sa.Date),
        sa.Column('age_years',       sa.SmallInteger),
        sa.Column('amenities',       JSONB),
        sa.Column('images',          JSONB),
        sa.Column('floor_plan_url',  sa.Text),
        sa.Column('virtual_tour_url',sa.Text),
        sa.Column('rating',          sa.Float),
        sa.Column('locality_rating', sa.Float),
        sa.Column('safety_rating',   sa.Float),
        sa.Column('source_url',      sa.Text),
        sa.Column('data_source',     sa.String(30)),
        sa.Column('external_id',     sa.String(100)),
        sa.Column('verified',        sa.Boolean, default=False),
        sa.Column('featured',        sa.Boolean, default=False),
        sa.Column('embedding_id',    sa.Integer),
        sa.Column('estate_agent',    sa.String(100)),
        sa.Column('council_tax_band',sa.String(2)),
        sa.Column('nearest_station', sa.String(100)),
        sa.Column('station_distance',sa.String(20)),
        sa.Column('broadband_speed', sa.String(20)),
        sa.Column('flood_risk',      sa.String(20)),
        sa.Column('raw_data',        JSONB),
        sa.Column('listed_at',       sa.DateTime),
        sa.Column('updated_at',      sa.DateTime),
    )
    op.create_index('ix_properties_country', 'properties', ['country'])
    op.create_index('ix_properties_city',    'properties', ['city'])
    op.create_index('ix_properties_price',   'properties', ['price'])
    op.create_index('ix_properties_country_city', 'properties', ['country', 'city'])
    op.create_unique_constraint('uq_source_external', 'properties', ['data_source', 'external_id'])

    op.create_table(
        'users',
        sa.Column('id',                 UUID(as_uuid=False), primary_key=True),
        sa.Column('email',              sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash',      sa.String(255), nullable=False),
        sa.Column('name',               sa.String(100)),
        sa.Column('country_preference', sa.String(50)),
        sa.Column('city_preference',    sa.String(100)),
        sa.Column('phone',              sa.String(30)),
        sa.Column('is_active',          sa.Boolean, default=True),
        sa.Column('is_verified',        sa.Boolean, default=False),
        sa.Column('created_at',         sa.DateTime),
        sa.Column('last_login',         sa.DateTime),
    )

    op.create_table(
        'favorites',
        sa.Column('id',          UUID(as_uuid=False), primary_key=True),
        sa.Column('user_id',     UUID(as_uuid=False), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('property_id', UUID(as_uuid=False), sa.ForeignKey('properties.id'), nullable=False),
        sa.Column('saved_at',    sa.DateTime),
        sa.Column('notes',       sa.Text),
        sa.UniqueConstraint('user_id', 'property_id', name='uq_user_property'),
    )

    op.create_table(
        'alerts',
        sa.Column('id',             UUID(as_uuid=False), primary_key=True),
        sa.Column('user_id',        UUID(as_uuid=False), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('query_text',     sa.Text, nullable=False),
        sa.Column('filters',        JSONB),
        sa.Column('country',        sa.String(50)),
        sa.Column('city',           sa.String(100)),
        sa.Column('is_active',      sa.Boolean, default=True),
        sa.Column('frequency',      sa.String(20), default='daily'),
        sa.Column('last_triggered', sa.DateTime),
        sa.Column('match_count',    sa.Integer, default=0),
        sa.Column('created_at',     sa.DateTime),
    )

    op.create_table(
        'alert_matches',
        sa.Column('id',          UUID(as_uuid=False), primary_key=True),
        sa.Column('alert_id',    UUID(as_uuid=False), sa.ForeignKey('alerts.id'), nullable=False),
        sa.Column('property_id', UUID(as_uuid=False), sa.ForeignKey('properties.id'), nullable=False),
        sa.Column('notified_at', sa.DateTime),
        sa.Column('channel',     sa.String(20), default='email'),
        sa.UniqueConstraint('alert_id', 'property_id', name='uq_alert_property'),
    )

    op.create_table(
        'ingestion_logs',
        sa.Column('id',              UUID(as_uuid=False), primary_key=True),
        sa.Column('source',          sa.String(50)),
        sa.Column('country',         sa.String(50)),
        sa.Column('city',            sa.String(100)),
        sa.Column('records_fetched', sa.Integer, default=0),
        sa.Column('records_new',     sa.Integer, default=0),
        sa.Column('records_updated', sa.Integer, default=0),
        sa.Column('records_dupes',   sa.Integer, default=0),
        sa.Column('errors',          JSONB),
        sa.Column('duration_secs',   sa.Float),
        sa.Column('started_at',      sa.DateTime),
        sa.Column('completed_at',    sa.DateTime),
        sa.Column('status',          sa.String(20)),
    )


def downgrade():
    for table in ['alert_matches', 'alerts', 'favorites', 'users', 'ingestion_logs', 'properties']:
        op.drop_table(table)
