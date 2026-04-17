-- CreateTable
CREATE TABLE `SourceProvider` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `providerType` ENUM('RETAILER', 'API', 'MARKETPLACE', 'MANUAL') NOT NULL,
    `websiteUrl` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `logoLabel` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Australia',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AUD',
    `trustScore` INTEGER NOT NULL DEFAULT 70,
    `refreshMinutes` INTEGER NOT NULL DEFAULT 30,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SourceProvider_slug_key`(`slug`),
    UNIQUE INDEX `SourceProvider_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SourceLink` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,
    `label` VARCHAR(191) NULL,
    `sourceUrl` VARCHAR(191) NOT NULL,
    `providerItemId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SourceLink_providerId_productId_idx`(`providerId`, `productId`),
    INDEX `SourceLink_providerId_cardId_idx`(`providerId`, `cardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IngestRun` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `status` ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'RUNNING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `fetchedCount` INTEGER NOT NULL DEFAULT 0,
    `matchedCount` INTEGER NOT NULL DEFAULT 0,
    `createdCount` INTEGER NOT NULL DEFAULT 0,
    `updatedCount` INTEGER NOT NULL DEFAULT 0,
    `errorSummary` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawSourceRecord` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `ingestRunId` VARCHAR(191) NOT NULL,
    `sourceLinkId` VARCHAR(191) NULL,
    `sourceUrl` VARCHAR(191) NOT NULL,
    `sourceTitle` VARCHAR(191) NULL,
    `priceText` VARCHAR(191) NULL,
    `stockText` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `matchedProductId` VARCHAR(191) NULL,
    `matchedCardId` VARCHAR(191) NULL,

    INDEX `RawSourceRecord_providerId_fetchedAt_idx`(`providerId`, `fetchedAt`),
    INDEX `RawSourceRecord_matchedProductId_idx`(`matchedProductId`),
    INDEX `RawSourceRecord_matchedCardId_idx`(`matchedCardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListingSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `sourceLinkId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,
    `sourceUrl` VARCHAR(191) NOT NULL,
    `sourceTitle` VARCHAR(191) NOT NULL,
    `providerItemId` VARCHAR(191) NULL,
    `normalizedPriceAud` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AUD',
    `stockStatus` ENUM('IN_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'PLACEHOLDER') NOT NULL,
    `isPreorder` BOOLEAN NOT NULL DEFAULT false,
    `isPlaceholder` BOOLEAN NOT NULL DEFAULT false,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `restockDetectedAt` DATETIME(3) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sourceConfidence` INTEGER NOT NULL DEFAULT 70,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ListingSnapshot_sourceLinkId_key`(`sourceLinkId`),
    INDEX `ListingSnapshot_productId_fetchedAt_idx`(`productId`, `fetchedAt`),
    INDEX `ListingSnapshot_cardId_fetchedAt_idx`(`cardId`, `fetchedAt`),
    INDEX `ListingSnapshot_providerId_fetchedAt_idx`(`providerId`, `fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesRecord` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `cardId` VARCHAR(191) NULL,
    `sourceTitle` VARCHAR(191) NOT NULL,
    `saleUrl` VARCHAR(191) NULL,
    `normalizedPriceAud` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AUD',
    `condition` VARCHAR(191) NULL,
    `shippingAud` DECIMAL(10, 2) NULL,
    `soldAt` DATETIME(3) NOT NULL,
    `sourceConfidence` INTEGER NOT NULL DEFAULT 60,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SalesRecord_productId_soldAt_idx`(`productId`, `soldAt`),
    INDEX `SalesRecord_cardId_soldAt_idx`(`cardId`, `soldAt`),
    INDEX `SalesRecord_providerId_soldAt_idx`(`providerId`, `soldAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SourceLink` ADD CONSTRAINT `SourceLink_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `SourceProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourceLink` ADD CONSTRAINT `SourceLink_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourceLink` ADD CONSTRAINT `SourceLink_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IngestRun` ADD CONSTRAINT `IngestRun_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `SourceProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawSourceRecord` ADD CONSTRAINT `RawSourceRecord_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `SourceProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawSourceRecord` ADD CONSTRAINT `RawSourceRecord_ingestRunId_fkey` FOREIGN KEY (`ingestRunId`) REFERENCES `IngestRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawSourceRecord` ADD CONSTRAINT `RawSourceRecord_sourceLinkId_fkey` FOREIGN KEY (`sourceLinkId`) REFERENCES `SourceLink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawSourceRecord` ADD CONSTRAINT `RawSourceRecord_matchedProductId_fkey` FOREIGN KEY (`matchedProductId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawSourceRecord` ADD CONSTRAINT `RawSourceRecord_matchedCardId_fkey` FOREIGN KEY (`matchedCardId`) REFERENCES `Card`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingSnapshot` ADD CONSTRAINT `ListingSnapshot_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `SourceProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingSnapshot` ADD CONSTRAINT `ListingSnapshot_sourceLinkId_fkey` FOREIGN KEY (`sourceLinkId`) REFERENCES `SourceLink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingSnapshot` ADD CONSTRAINT `ListingSnapshot_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingSnapshot` ADD CONSTRAINT `ListingSnapshot_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesRecord` ADD CONSTRAINT `SalesRecord_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `SourceProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesRecord` ADD CONSTRAINT `SalesRecord_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesRecord` ADD CONSTRAINT `SalesRecord_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
