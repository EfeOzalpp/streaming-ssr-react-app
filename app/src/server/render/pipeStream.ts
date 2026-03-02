// src/server/render/pipeStream.ts
import { Transform } from 'stream';
import type { Request, Response } from 'express';
import { renderToPipeableStream } from 'react-dom/server';
import type { ReactElement } from 'react';

export interface PipeReactStreamOpts {
  jsx: ReactElement;
  htmlOpen: string;
  htmlClose: string;
  req: Request;
  res: Response;
  IS_DEV: boolean;
}

/**
 * Calls renderToPipeableStream and pipes React output through a Transform that
 * appends htmlClose as the very last bytes, then into res.
 * Handles shell errors, per-error logging, and a hard abort timeout.
 */
export function pipeReactStream({ jsx, htmlOpen, htmlClose, req, res, IS_DEV }: PipeReactStreamOpts): void {
  let didError = false;
  const ABORT_MS = IS_DEV ? 30000 : 10000;
  let abortTimer: ReturnType<typeof setTimeout> | undefined;

  const stream = renderToPipeableStream(jsx, {
    onShellReady() {
      console.log('[SSR] shell ready', req.method, req.url);

      res.statusCode = didError ? 500 : 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(htmlOpen);

      // Append htmlClose after React finishes streaming
      const footer = new Transform({
        transform(chunk, _enc, cb) {
          cb(null, chunk);
        },
        flush(cb) {
          this.push(htmlClose);
          cb();
        },
      });

      // React → footer → res; the footer flush ends the response naturally
      stream.pipe(footer).pipe(res);

      req.on('close', () => {
        if (!res.writableEnded) {
          console.warn('[SSR] client disconnected, aborting');
          stream.abort();
        }
      });
    },

    onAllReady() {
      console.log('[SSR] all ready', req.method, req.url);
      clearTimeout(abortTimer);
    },

    onShellError(err) {
      clearTimeout(abortTimer);
      console.error('[SSR] Shell error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      }
      if (!res.writableEnded) res.end('An error occurred while loading the app.');
    },

    onError(err) {
      didError = true;
      console.error('[SSR] Error:', err);
    },
  });

  abortTimer = setTimeout(() => {
    if (!res.writableEnded) {
      console.warn('[SSR] Aborting stream after timeout');
      stream.abort();
    }
  }, ABORT_MS);
}
