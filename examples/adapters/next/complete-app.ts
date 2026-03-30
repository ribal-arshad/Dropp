// @ts-nocheck
/**
 * Next.js + Dropp example (single-package setup)
 *
 * This file is a reference snippet with copy/paste-ready exports.
 * In a real app, split these into:
 * - app/api/media/route.ts
 * - app/api/media/[id]/route.ts
 * - lib/dropp.ts
 */

import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import {
  Dropp,
  JsonFileMediaRepository,
  LocalStorageDriver,
  SharpTransformationDriver,
  handleDeleteMedia,
  handleGetMedia,
  handleGetModelMedia,
  handleUpload,
} from "droppjs";

export const dropp = new Dropp({
  repository: new JsonFileMediaRepository(
    path.join(process.cwd(), ".dropp", "media.json"),
  ),
  storage: new LocalStorageDriver(
    path.join(process.cwd(), "public", "uploads"),
    "/uploads",
  ),
  transformer: new SharpTransformationDriver(),
});

/**
 * Example for app/api/media/route.ts -> POST
 */
export async function POST_mediaRoute(request: NextRequest) {
  const model = request.nextUrl.searchParams.get("model");
  const modelId = request.nextUrl.searchParams.get("modelId");
  const collection =
    request.nextUrl.searchParams.get("collection") ?? undefined;

  if (!model || !modelId) {
    return NextResponse.json(
      { error: "model and modelId query params required" },
      { status: 400 },
    );
  }

  return handleUpload(request, { dropp, model, modelId, collection });
}

/**
 * Example for app/api/media/route.ts -> GET
 */
export async function GET_mediaRoute(request: NextRequest) {
  const model = request.nextUrl.searchParams.get("model");
  const modelId = request.nextUrl.searchParams.get("modelId");

  if (!model || !modelId) {
    return NextResponse.json(
      { error: "model and modelId query params required" },
      { status: 400 },
    );
  }

  return handleGetModelMedia(model, modelId, { dropp });
}

/**
 * Example for app/api/media/[id]/route.ts -> GET
 */
export async function GET_mediaByIdRoute(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  return handleGetMedia(context.params.id, { dropp });
}

/**
 * Example for app/api/media/[id]/route.ts -> DELETE
 */
export async function DELETE_mediaByIdRoute(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  return handleDeleteMedia(context.params.id, { dropp });
}
