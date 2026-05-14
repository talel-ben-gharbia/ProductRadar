<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260511000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add product_id, company_id, ends_at to b2b_sponsored_article';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_sponsored_article ADD product_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_sponsored_article ADD company_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_sponsored_article ADD ends_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_sponsored_article ALTER status TYPE VARCHAR(20)');
        $this->addSql('COMMENT ON COLUMN b2b_sponsored_article.ends_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE INDEX idx_b2b_sponsored_article_product ON b2b_sponsored_article (product_id)');
        $this->addSql('CREATE INDEX idx_b2b_sponsored_article_company ON b2b_sponsored_article (company_id)');
        $this->addSql('ALTER TABLE b2b_sponsored_article ADD CONSTRAINT FK_b2b_sponsored_article_product FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE b2b_sponsored_article ADD CONSTRAINT FK_b2b_sponsored_article_company FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_sponsored_article DROP CONSTRAINT IF EXISTS FK_b2b_sponsored_article_product');
        $this->addSql('ALTER TABLE b2b_sponsored_article DROP CONSTRAINT IF EXISTS FK_b2b_sponsored_article_company');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_sponsored_article_product');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_sponsored_article_company');
        $this->addSql('ALTER TABLE b2b_sponsored_article DROP product_id');
        $this->addSql('ALTER TABLE b2b_sponsored_article DROP company_id');
        $this->addSql('ALTER TABLE b2b_sponsored_article DROP ends_at');
    }
}
