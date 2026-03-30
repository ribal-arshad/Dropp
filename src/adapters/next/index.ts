/**
 * Next.js API route helpers for Dropp
 */

export interface NextDroppHandlerOptions {
  dropp: any;
  model: string;
  modelId: string;
  tenantId?: string;
  collection?: string;
}

export interface MediaResponse {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
  size: number;
  model: string;
  modelId: string;
  collection?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper to create JSON responses
 */
function jsonResponse(data: any, status = 200) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

/**
 * Handle file upload for Next.js API route
 *
 * Usage in app/api/media/route.ts:
 * ```typescript
 * import { handleUpload } from "./index.js";
 * import { dropp } from "@/lib/dropp";
 *
 * export async function POST(request: NextRequest) {
 *   return handleUpload(request, {
 *     dropp,
 *     model: "article",
 *     modelId: request.nextUrl.searchParams.get("modelId") || ""
 *   });
 * }
 * ```
 */
export async function handleUpload(
  request: any,
  options: NextDroppHandlerOptions,
): Promise<any> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as any;

    if (!file) {
      return jsonResponse({ error: "No file uploaded" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const input = {
      file: buffer,
      fileName: file.name,
      mimeType: file.type,
      model: options.model,
      modelId: options.modelId,
      collection: options.collection,
    } as Record<string, unknown>;

    if (options.tenantId) {
      input.tenantId = options.tenantId;
    }

    const media = await options.dropp.attach(input);

    return jsonResponse(media, 201);
  } catch (error) {
    console.error("[Dropp Upload Error]", error);
    return jsonResponse(
      { error: "Upload failed", message: (error as Error).message },
      500,
    );
  }
}

/**
 * Handle GET requests for media
 *
 * Usage in app/api/media/[id]/route.ts:
 * ```typescript
 * import { handleGetMedia } from "./index.js";
 * import { dropp } from "@/lib/dropp";
 *
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: { id: string } }
 * ) {
 *   return handleGetMedia(params.id, { dropp });
 * }
 * ```
 */
export async function handleGetMedia(
  id: string,
  options: { dropp: any },
): Promise<any> {
  try {
    const media = await options.dropp.get(id);

    if (!media) {
      return jsonResponse({ error: "Media not found" }, 404);
    }

    return jsonResponse(media);
  } catch (error) {
    console.error("[Dropp Get Error]", error);
    return jsonResponse(
      { error: "Failed to retrieve media", message: (error as Error).message },
      500,
    );
  }
}

/**
 * Handle DELETE requests for media
 *
 * Usage in app/api/media/[id]/route.ts:
 * ```typescript
 * import { handleDeleteMedia } from "./index.js";
 * import { dropp } from "@/lib/dropp";
 *
 * export async function DELETE(
 *   request: NextRequest,
 *   { params }: { params: { id: string } }
 * ) {
 *   return handleDeleteMedia(params.id, { dropp });
 * }
 * ```
 */
export async function handleDeleteMedia(
  id: string,
  options: { dropp: any },
): Promise<any> {
  try {
    await options.dropp.delete(id);
    return jsonResponse(null, 204);
  } catch (error) {
    console.error("[Dropp Delete Error]", error);
    return jsonResponse(
      { error: "Failed to delete media", message: (error as Error).message },
      500,
    );
  }
}

/**
 * Handle GET requests for model media
 *
 * Usage in app/api/media/model/[model]/[modelId]/route.ts:
 * ```typescript
 * import { handleGetModelMedia } from "./index.js";
 * import { dropp } from "@/lib/dropp";
 *
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: { model: string; modelId: string } }
 * ) {
 *   return handleGetModelMedia(params.model, params.modelId, { dropp });
 * }
 * ```
 */
export async function handleGetModelMedia(
  model: string,
  modelId: string,
  options: { dropp: any },
): Promise<any> {
  try {
    const media = await options.dropp.getByModel(model, modelId);
    return jsonResponse(media);
  } catch (error) {
    console.error("[Dropp Get Model Media Error]", error);
    return jsonResponse(
      {
        error: "Failed to retrieve media",
        message: (error as Error).message,
      },
      500,
    );
  }
}

/**
 * React Server Component helper to fetch media
 *
 * Usage:
 * ```typescript
 * import { getMedia } from "./index.js";
 *
 * export default async function MediaComponent({ mediaId }: { mediaId: string }) {
 *   const media = await getMedia(mediaId);
 *   return <img src={media.url} alt={media.fileName} />;
 * }
 * ```
 */
export async function getMedia(id: string): Promise<MediaResponse> {
  const response = await fetch(`/api/media/${id}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch media");
  }

  return response.json();
}

/**
 * Client-side hook for uploading media
 */
export function useMediaUpload() {
  const upload = async (
    file: any,
    model: string,
    modelId: string,
    collection?: string,
  ): Promise<MediaResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = new URLSearchParams({ model, modelId });
    if (collection) params.append("collection", collection);

    const response = await fetch(`/api/media?${params}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  };

  const deleteMedia = async (id: string): Promise<void> => {
    const response = await fetch(`/api/media/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Delete failed");
    }
  };

  return { upload, deleteMedia };
}

export default handleUpload;
