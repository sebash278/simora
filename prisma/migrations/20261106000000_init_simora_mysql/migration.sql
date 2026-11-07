-- Migración inicial SIMORA para MySQL 8.0+
CREATE TABLE `spaces` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `category` VARCHAR(40) NOT NULL DEFAULT 'Aula',
    `recommendedThreshold` DOUBLE NOT NULL DEFAULT 70,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `spaces_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `devices` (
    `id` VARCHAR(80) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `calibrationOffset` DOUBLE NOT NULL DEFAULT 0,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `noise_readings` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(80) NOT NULL,
    `deviceName` VARCHAR(120) NOT NULL,
    `spaceId` VARCHAR(191) NULL,
    `location` VARCHAR(120) NOT NULL,
    `decibels` DOUBLE NOT NULL,
    `classification` VARCHAR(24) NOT NULL,
    `isAlert` BOOLEAN NOT NULL DEFAULT false,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `noise_readings_timestamp_idx`(`timestamp` DESC),
    INDEX `noise_readings_location_timestamp_idx`(`location`, `timestamp` DESC),
    INDEX `noise_readings_classification_idx`(`classification`),
    INDEX `noise_readings_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `noise_readings` ADD CONSTRAINT `noise_readings_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `noise_readings` ADD CONSTRAINT `noise_readings_spaceId_fkey` FOREIGN KEY (`spaceId`) REFERENCES `spaces`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
