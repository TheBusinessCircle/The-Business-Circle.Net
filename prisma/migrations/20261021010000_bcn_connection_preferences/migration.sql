-- Separate, optional permission to receive BCN conversation requests.
-- Existing profiles remain opted out until their owner chooses otherwise.
ALTER TABLE "BcnBusinessProfile" ADD COLUMN "acceptsMessages" BOOLEAN NOT NULL DEFAULT false;
