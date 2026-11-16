-- AlterTable
ALTER TABLE "platform_accounts" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "oauthRefreshToken" TEXT,
ADD COLUMN     "oauthScopes" TEXT;
