<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260419201000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Backfills FREE subscriptions for existing customers without a subscription row.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            "INSERT INTO subscription (plan_type, start_date, end_date, active, alerts_limit, favorites_limit, price_history_access, client_id)
             SELECT 'FREE', NOW(), NOW() + INTERVAL '100 years', true, 3, 5, 1, c.id
             FROM customer c
             LEFT JOIN subscription s ON s.client_id = c.id
             WHERE s.id IS NULL"
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql(
            "DELETE FROM subscription
             WHERE plan_type = 'FREE'
               AND alerts_limit = 3
               AND favorites_limit = 5
               AND price_history_access = 1
               AND client_id IN (SELECT id FROM customer)"
        );
    }
}
