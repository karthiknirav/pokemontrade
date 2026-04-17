-- CreateTable
CREATE TABLE `FlashSalePattern` (
    `id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `hourAest` INTEGER NOT NULL,
    `occurrenceCount` INTEGER NOT NULL DEFAULT 1,
    `confidencePct` INTEGER NOT NULL DEFAULT 30,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FlashSalePattern_dayOfWeek_hourAest_idx`(`dayOfWeek`, `hourAest`),
    UNIQUE INDEX `FlashSalePattern_source_dayOfWeek_hourAest_key`(`source`, `dayOfWeek`, `hourAest`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FlashSaleTrigger` (
    `id` VARCHAR(191) NOT NULL,
    `retailerSlug` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `priceAud` DECIMAL(10, 2) NOT NULL,
    `stockStatus` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(191) NOT NULL,
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notifiedAt` DATETIME(3) NULL,
    `notifyChannel` VARCHAR(191) NOT NULL DEFAULT 'telegram',

    INDEX `FlashSaleTrigger_retailerSlug_detectedAt_idx`(`retailerSlug`, `detectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
