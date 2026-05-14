<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add unique constraint to favorite and indexes to alert/notification';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE favorite ADD CONSTRAINT uq_favorite_client_listing UNIQUE (client_id, product_listing_id)');
        $this->addSql('CREATE INDEX idx_alert_product ON alert (product_id)');
        $this->addSql('CREATE INDEX idx_alert_alerter ON alert (alerter_id)');
        $this->addSql('CREATE INDEX idx_notification_client ON notification (client_id)');
        $this->addSql('CREATE INDEX idx_notification_company ON notification (company_id)');
        $this->addSql('CREATE INDEX idx_notification_market ON notification (market_id)');
        $this->addSql('CREATE INDEX idx_notification_created ON notification (created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE favorite DROP CONSTRAINT IF EXISTS uq_favorite_client_listing');
        $this->addSql('DROP INDEX IF EXISTS idx_alert_product');
        $this->addSql('DROP INDEX IF EXISTS idx_alert_alerter');
        $this->addSql('DROP INDEX IF EXISTS idx_notification_client');
        $this->addSql('DROP INDEX IF EXISTS idx_notification_company');
        $this->addSql('DROP INDEX IF EXISTS idx_notification_market');
        $this->addSql('DROP INDEX IF EXISTS idx_notification_created');
    }
}
