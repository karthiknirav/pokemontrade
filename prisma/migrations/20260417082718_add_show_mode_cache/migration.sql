-- CreateTable
CREATE TABLE `ShowModeCache` (
    `id` VARCHAR(191) NOT NULL,
    `query` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `setName` VARCHAR(191) NOT NULL,
    `cardNumber` VARCHAR(191) NOT NULL,
    `priceAud` DECIMAL(10, 2) NOT NULL,
    `tcgplayerUrl` VARCHAR(500) NULL,
    `cachedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ShowModeCache_query_key`(`query`),
    INDEX `ShowModeCache_cachedAt_idx`(`cachedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
