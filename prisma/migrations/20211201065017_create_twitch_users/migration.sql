-- CreateTable
CREATE TABLE "TwitchUser" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "lastStartAt" TIMESTAMP(3),

    CONSTRAINT "TwitchUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwitchUser_username_key" ON "TwitchUser"("username");
