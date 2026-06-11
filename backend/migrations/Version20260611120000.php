<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260611120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Fix orphaned b2b_company/b2b_market rows missing parent b2b records';
    }

    public function up(Schema $schema): void
    {
        // Insert missing b2b rows for orphaned b2b_company records
        $this->addSql("
            INSERT INTO b2b (id, owner_user_id, seller_id, full_name, name, sector, company_country, company_website, b2b_status, joined_at, updated_at, is_verified, usage_json)
            SELECT u.id, NULL, NULL, NULL, 'Unknown Company', NULL, NULL, NULL, 'PENDING', NOW(), NULL, false, NULL::json
            FROM \"user\" u
            JOIN b2b_company bc ON bc.id = u.id
            LEFT JOIN b2b b ON b.id = u.id
            WHERE b.id IS NULL
              AND u.type = 'b2b_company'
        ");

        // Insert missing b2b rows for orphaned b2b_market records
        $this->addSql("
            INSERT INTO b2b (id, owner_user_id, seller_id, full_name, name, sector, company_country, company_website, b2b_status, joined_at, updated_at, is_verified, usage_json)
            SELECT u.id, NULL, NULL, NULL, 'Unknown Market', NULL, NULL, NULL, 'PENDING', NOW(), NULL, false, NULL::json
            FROM \"user\" u
            JOIN b2b_market bm ON bm.id = u.id
            LEFT JOIN b2b b ON b.id = u.id
            WHERE b.id IS NULL
              AND u.type = 'b2b_market'
        ");
    }

    public function down(Schema $schema): void
    {
        // Remove b2b rows that have no actual data (orphaned fix records)
        $this->addSql("
            DELETE FROM b2b
            WHERE id IN (
                SELECT b.id FROM b2b b
                LEFT JOIN b2b_company bc ON bc.id = b.id
                LEFT JOIN b2b_market bm ON bm.id = b.id
                WHERE bc.id IS NULL AND bm.id IS NULL
                   OR (b.name = 'Unknown Company' OR b.name = 'Unknown Market')
            )
        ");
    }
}
