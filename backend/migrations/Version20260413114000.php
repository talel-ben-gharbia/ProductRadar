<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260413114000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add unique favorite per user and listing';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DELETE FROM favorite a USING favorite b WHERE a.id < b.id AND a.client_id = b.client_id AND a.product_listing_id = b.product_listing_id');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_68C58ED919EB69214706C231 ON favorite (client_id, product_listing_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_68C58ED919EB69214706C231');
    }
}
