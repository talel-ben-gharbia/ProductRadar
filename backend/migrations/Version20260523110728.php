<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260523110728 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add composite indexes for notification, b2b_search_log, and price_history performance';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_notification_company_created ON notification (company_id, created_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_notification_market_created ON notification (market_id, created_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_notification_client_created ON notification (client_id, created_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_search_log_owner_created ON b2b_search_log (owner_type, created_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_price_history_recorded_seller ON price_history (recorded_at, seller_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_tsh_listing_id_score ON trust_score_history (listing_id, id, score)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_notification_company_created');
        $this->addSql('DROP INDEX IF EXISTS idx_notification_market_created');
        $this->addSql('DROP INDEX IF EXISTS idx_notification_client_created');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_search_log_owner_created');
        $this->addSql('DROP INDEX IF EXISTS idx_price_history_recorded_seller');
        $this->addSql('DROP INDEX IF EXISTS idx_tsh_listing_id_score');
    }
}
