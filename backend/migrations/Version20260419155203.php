<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260419155203 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE alert ADD CONSTRAINT FK_17FD46C14584665A FOREIGN KEY (product_id) REFERENCES product (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE price_history ADD CONSTRAINT FK_4C9CB8174706C231 FOREIGN KEY (product_listing_id) REFERENCES product_listing (id)');
        $this->addSql('ALTER TABLE product_listing DROP CONSTRAINT fk_listing_seller');
        $this->addSql('ALTER TABLE product_listing DROP CONSTRAINT fk_listing_product');
        $this->addSql('ALTER TABLE product_listing DROP CONSTRAINT unique_seller_ref');
        $this->addSql('ALTER TABLE product_listing ADD CONSTRAINT FK_1AD953644584665A FOREIGN KEY (product_id) REFERENCES product (id)');
        $this->addSql('ALTER TABLE product_listing ADD CONSTRAINT FK_1AD953648DE820D9 FOREIGN KEY (seller_id) REFERENCES seller (id) NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE alert DROP CONSTRAINT FK_17FD46C14584665A');
        $this->addSql('ALTER TABLE price_history DROP CONSTRAINT FK_4C9CB8174706C231');
        $this->addSql('ALTER TABLE product_listing DROP CONSTRAINT FK_1AD953644584665A');
        $this->addSql('ALTER TABLE product_listing DROP CONSTRAINT FK_1AD953648DE820D9');
        $this->addSql('ALTER TABLE product_listing ADD CONSTRAINT fk_listing_seller FOREIGN KEY (seller_id) REFERENCES seller (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE product_listing ADD CONSTRAINT fk_listing_product FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE product_listing ADD CONSTRAINT unique_seller_ref UNIQUE (seller_id, ref)');
    }
}
