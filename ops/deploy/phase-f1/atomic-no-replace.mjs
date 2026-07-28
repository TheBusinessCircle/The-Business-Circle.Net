import { randomBytes } from "node:crypto";
import {
  closeSync,
  fchmodSync,
  fchownSync,
  fsyncSync,
  fstatSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

function writeComplete(fd, payload) {
  let offset = 0;
  while (offset < payload.length) {
    const written = writeSync(fd, payload, offset, payload.length - offset);
    if (written <= 0) {
      throw new Error("Protected publication made no forward write progress.");
    }
    offset += written;
  }
  if (offset !== payload.length || fstatSync(fd).size !== payload.length) {
    throw new Error("Protected publication write length verification failed.");
  }
}

function fsyncDirectory(directory) {
  const fd = openSync(directory, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function sameIdentity(stats, identity) {
  return stats.dev === identity.dev && stats.ino === identity.ino;
}

function safeUnlinkCreated(path, identity) {
  let stats;
  try {
    stats = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    !sameIdentity(stats, identity)
  ) {
    throw new Error(`Refusing cleanup of a changed protected path: ${path}`);
  }
  unlinkSync(path);
}

function verifyPublishedEntry(entry, identity, enforceMetadata) {
  const stats = lstatSync(entry.target);
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1 ||
    !sameIdentity(stats, identity) ||
    stats.size !== entry.payload.length
  ) {
    throw new Error(
      `Protected publication identity verification failed: ${entry.target}`
    );
  }
  if (enforceMetadata && (stats.mode & 0o777) !== entry.mode) {
    throw new Error(
      `Protected publication mode verification failed: ${entry.target}`
    );
  }
  if (
    enforceMetadata &&
    entry.uid !== undefined &&
    entry.gid !== undefined &&
    (stats.uid !== entry.uid || stats.gid !== entry.gid)
  ) {
    throw new Error(
      `Protected publication ownership verification failed: ${entry.target}`
    );
  }
  if (!readFileSync(entry.target).equals(entry.payload)) {
    throw new Error(
      `Protected publication content verification failed: ${entry.target}`
    );
  }
  entry.verify?.(entry.target);
}

export function publishNoReplaceSet(entries, options = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("At least one protected publication entry is required.");
  }
  const prepared = entries.map((input) => {
    const target = resolve(input.target);
    const directory = dirname(target);
    const payload = Buffer.isBuffer(input.payload)
      ? input.payload
      : Buffer.from(input.payload);
    const temporary = join(
      directory,
      `.${basename(target)}.${process.pid}.${randomBytes(12).toString("hex")}.tmp`
    );
    return {
      ...input,
      target,
      directory,
      payload,
      temporary,
      mode: input.mode ?? 0o640
    };
  });
  if (new Set(prepared.map(({ target }) => target)).size !== prepared.length) {
    throw new Error("Protected publication targets must be unique.");
  }

  const staged = [];
  const published = [];
  const enforceMetadata = options.enforceMetadata !== false;
  const syncDirectories = options.fsyncDirectories !== false;
  try {
    for (const entry of prepared) {
      const fd = openSync(entry.temporary, "wx", 0o600);
      try {
        writeComplete(fd, entry.payload);
        if (entry.uid !== undefined && entry.gid !== undefined) {
          fchownSync(fd, entry.uid, entry.gid);
        }
        fchmodSync(fd, entry.mode);
        fsyncSync(fd);
        if (!readFileSync(entry.temporary).equals(entry.payload)) {
          throw new Error(
            `Protected staging content verification failed: ${entry.target}`
          );
        }
        const stats = fstatSync(fd);
        if (!stats.isFile() || stats.nlink !== 1) {
          throw new Error(
            `Protected staging file identity is invalid: ${entry.target}`
          );
        }
        staged.push({ entry, identity: { dev: stats.dev, ino: stats.ino } });
      } finally {
        closeSync(fd);
      }
    }

    for (const stagedEntry of staged) {
      const { entry, identity } = stagedEntry;
      // link(2) is an atomic no-replace publication primitive: it fails with
      // EEXIST and cannot overwrite an existing destination. The same-directory
      // temporary is removed immediately, leaving one link at the final path.
      linkSync(entry.temporary, entry.target);
      published.push({ entry, identity });
      unlinkSync(entry.temporary);
      if (syncDirectories) fsyncDirectory(entry.directory);
    }

    for (const { entry, identity } of published) {
      verifyPublishedEntry(entry, identity, enforceMetadata);
    }
    for (const directory of new Set(prepared.map(({ directory }) => directory))) {
      if (syncDirectories) fsyncDirectory(directory);
    }
    options.verifySet?.(prepared.map(({ target }) => target));
    return prepared.map(({ target }) => target);
  } catch (error) {
    const cleanupErrors = [];
    for (const { entry, identity } of [...published].reverse()) {
      try {
        safeUnlinkCreated(entry.target, identity);
        if (syncDirectories) fsyncDirectory(entry.directory);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    for (const { entry, identity } of staged) {
      try {
        safeUnlinkCreated(entry.temporary, identity);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "Protected publication failed and guarded cleanup was incomplete."
      );
    }
    throw error;
  }
}
