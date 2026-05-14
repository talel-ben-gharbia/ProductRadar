<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop event_outbox table, triggers, and functions (unused)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP TRIGGER IF EXISTS trg_event_outbox_price_history_insert ON price_history');
        $this->addSql('DROP TRIGGER IF EXISTS trg_event_outbox_product_listing_update ON product_listing');
        $this->addSql('DROP FUNCTION IF EXISTS event_outbox_on_price_history_insert()');
        $this->addSql('DROP FUNCTION IF EXISTS event_outbox_on_product_listing_update()');
        $this->addSql('DROP TABLE IF EXISTS event_outbox');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE TABLE event_outbox (
            id BIGSERIAL PRIMARY KEY,
            event_type VARCHAR(50) NOT NULL,
            aggregate_type VARCHAR(50) NOT NULL,
            aggregate_id BIGINT NOT NULL,
            payload JSON NOT NULL,
            created_at TIMESTAMP NOT NULL,
            processed_at TIMESTAMP DEFAULT NULL,
            attempts INT NOT NULL DEFAULT 0,
            last_error TEXT DEFAULT NULL
        )');
        $this->addSql('CREATE INDEX idx_event_outbox_unprocessed ON event_outbox (created_at ASC) WHERE processed_at IS NULL');

        $this->addSql('CREATE OR REPLACE FUNCTION event_outbox_on_price_history_insert()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, created_at)
                VALUES (
                    \'price_history.created\',
                    \'price_history\',
                    NEW.id,
                    jsonb_build_object(
                        \'price_history_id\', NEW.id,
                        \'product_listing_id\', NEW.product_listing_id,
                        \'seller_id\', NEW.seller_id,
                        \'recorded_price\', NEW.recorded_price,
                        \'out_of_stock\', NEW.out_of_stock,
                        \'anomaly\', NEW.anomaly
                    ),
                    NOW()
                );
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql');

        $this->addSql('CREATE TRIGGER trg_event_outbox_price_history_insert
            AFTER INSERT ON price_history
            FOR EACH ROW
            EXECUTE FUNCTION event_outbox_on_price_history_insert()');

        $this->addSql('CREATE OR REPLACE FUNCTION event_outbox_on_product_listing_update()
            RETURNS TRIGGER AS $$
            BEGIN
                IF OLD.price IS DISTINCT FROM NEW.price OR OLD.availability IS DISTINCT FROM NEW.availability OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
                    INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, created_at)
                    VALUES (
                        \'product_listing.updated\',
                        \'product_listing\',
                        NEW.id,
                        jsonb_build_object(
                            \'product_listing_id\', NEW.id,
                            \'seller_id\', NEW.seller_id,
                            \'old_price\', OLD.price,
                            \'new_price\', NEW.price,
                            \'old_availability\', OLD.availability,
                            \'new_availability\', NEW.availability,
                            \'old_is_active\', OLD.is_active,
                            \'new_is_active\', NEW.is_active
                        ),
                        NOW()
                    );
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql');

        $this->addSql('CREATE TRIGGER trg_event_outbox_product_listing_update
            AFTER UPDATE ON product_listing
            FOR EACH ROW
            EXECUTE FUNCTION event_outbox_on_product_listing_update()');
    }
}
