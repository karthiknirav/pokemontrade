-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TcgSet` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `series` VARCHAR(191) NOT NULL,
    `language` ENUM('ENGLISH', 'JAPANESE') NOT NULL,
    `releaseDate` DATETIME(3) NOT NULL,
    `msrpAud` DECIMAL(10, 2) NULL,
    `blueChip` BOOLEAN NOT NULL DEFAULT false,
    `speculative` BOOLEAN NOT NULL DEFAULT false,
    `overprintedRisk` INTEGER NOT NULL DEFAULT 50,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TcgSet_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Card` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `rarity` VARCHAR(191) NOT NULL,
    `pokemonCharacter` VARCHAR(191) NOT NULL,
    `language` ENUM('ENGLISH', 'JAPANESE') NOT NULL,
    `currentMarketPrice` DECIMAL(10, 2) NOT NULL,
    `lastSoldPrice` DECIMAL(10, 2) NOT NULL,
    `psa10Price` DECIMAL(10, 2) NULL,
    `liquidityScore` INTEGER NOT NULL DEFAULT 50,
    `popularityScore` INTEGER NOT NULL DEFAULT 50,
    `profitScore` INTEGER NOT NULL DEFAULT 50,
    `notes` VARCHAR(191) NULL,
    `setId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Card_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Retailer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `websiteUrl` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Australia',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AUD',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Retailer_name_key`(`name`),
    UNIQUE INDEX `Retailer_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `productType` ENUM('BOOSTER_BOX', 'BOOSTER_BUNDLE', 'ELITE_TRAINER_BOX', 'COLLECTION_BOX', 'TIN', 'LOOSE_PACK', 'SINGLE_CARD') NOT NULL,
    `category` ENUM('SEALED', 'SINGLE') NOT NULL,
    `sealed` BOOLEAN NOT NULL DEFAULT true,
    `language` ENUM('ENGLISH', 'JAPANESE') NOT NULL,
    `currentMarketPrice` DECIMAL(10, 2) NOT NULL,
    `lastSoldPrice` DECIMAL(10, 2) NOT NULL,
    `priceSource` VARCHAR(191) NOT NULL,
    `psa10Price` DECIMAL(10, 2) NULL,
    `liquidityScore` INTEGER NOT NULL DEFAULT 50,
    `popularityScore` INTEGER NOT NULL DEFAULT 50,
    `profitScore` INTEGER NOT NULL DEFAULT 50,
    `releaseDate` DATETIME(3) NOT NULL,
    `isPreorder` BOOLEAN NOT NULL DEFAULT false,
    `inStock` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(191) NULL,
    `setId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductListing` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `normalizedPrice` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AUD',
    `status` ENUM('IN_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'PLACEHOLDER') NOT NULL,
    `isPlaceholder` BOOLEAN NOT NULL DEFAULT false,
    `isPreorder` BOOLEAN NOT NULL DEFAULT false,
    `productUrl` VARCHAR(191) NOT NULL,
    `retailerId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductListing_productId_idx`(`productId`),
    INDEX `ProductListing_cardId_idx`(`cardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceHistory` (
    `id` VARCHAR(191) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `price` DECIMAL(10, 2) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,

    INDEX `PriceHistory_productId_recordedAt_idx`(`productId`, `recordedAt`),
    INDEX `PriceHistory_cardId_recordedAt_idx`(`cardId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortfolioItem` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,
    `label` VARCHAR(191) NOT NULL,
    `buyPriceAud` DECIMAL(10, 2) NOT NULL,
    `sellPriceAud` DECIMAL(10, 2) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `store` VARCHAR(191) NULL,
    `status` ENUM('SEALED', 'RIPPED', 'GRADED', 'SOLD', 'HELD') NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL,
    `soldAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alert` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,
    `type` ENUM('PRICE_DROP', 'RESTOCK', 'VALUE_BUY') NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'TRIGGERED') NOT NULL DEFAULT 'ACTIVE',
    `targetPriceAud` DECIMAL(10, 2) NULL,
    `triggeredAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recommendation` (
    `id` VARCHAR(191) NOT NULL,
    `action` ENUM('BUY', 'MAYBE', 'PASS', 'RIP', 'HOLD_SEALED', 'BUY_SINGLES_INSTEAD') NOT NULL,
    `confidenceBand` VARCHAR(191) NOT NULL,
    `buyScore` INTEGER NOT NULL,
    `flipScore` INTEGER NOT NULL,
    `longTermHoldScore` INTEGER NOT NULL,
    `ripScore` INTEGER NOT NULL,
    `riskScore` INTEGER NOT NULL,
    `buyUnderPriceAud` DECIMAL(10, 2) NULL,
    `summary` VARCHAR(191) NOT NULL,
    `reasoning` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScoreSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `buyScore` INTEGER NOT NULL,
    `flipScore` INTEGER NOT NULL,
    `longTermHoldScore` INTEGER NOT NULL,
    `ripScore` INTEGER NOT NULL,
    `riskScore` INTEGER NOT NULL,
    `estimated3m` DECIMAL(10, 2) NOT NULL,
    `estimated1y` DECIMAL(10, 2) NOT NULL,
    `estimated3y` DECIMAL(10, 2) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Card` ADD CONSTRAINT `Card_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `TcgSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `TcgSet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductListing` ADD CONSTRAINT `ProductListing_retailerId_fkey` FOREIGN KEY (`retailerId`) REFERENCES `Retailer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductListing` ADD CONSTRAINT `ProductListing_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductListing` ADD CONSTRAINT `ProductListing_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceHistory` ADD CONSTRAINT `PriceHistory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceHistory` ADD CONSTRAINT `PriceHistory_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioItem` ADD CONSTRAINT `PortfolioItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioItem` ADD CONSTRAINT `PortfolioItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioItem` ADD CONSTRAINT `PortfolioItem_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recommendation` ADD CONSTRAINT `Recommendation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recommendation` ADD CONSTRAINT `Recommendation_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScoreSnapshot` ADD CONSTRAINT `ScoreSnapshot_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScoreSnapshot` ADD CONSTRAINT `ScoreSnapshot_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
