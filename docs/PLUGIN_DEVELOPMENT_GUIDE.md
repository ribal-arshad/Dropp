# Plugin Development Guide

Write custom Dropp plugins to extend media handling without editing core code.

## What Plugins Do

Plugins hook into the media lifecycle:

- **`beforeUpload`** — Validate or modify file before storage (e.g., compress, encrypt)
- **`afterUpload`** — Enrich metadata after storage (e.g., extract EXIF, detect objects)
- **`beforeDelete`** — Prepare cleanup before deletion (e.g., notify external services)
- **`afterDelete`** — Run side effects after deletion (e.g., log, analytics)

## Plugin Interface

```ts
import type { MediaPlugin, AttachInput, Media } from "droppjs";

export class CustomPlugin implements MediaPlugin {
  async beforeUpload(input: AttachInput): Promise<void> {
    // Modify input.file, input.metadata, etc.
    // If validation fails, throw error
  }

  async afterUpload(media: Media): Promise<void> {
    // Access media.id, media.url, media.metadata
    // Can't modify returned media, but can trigger side effects
  }

  async beforeDelete(media: Media): Promise<void> {
    // Prepare cleanup
  }

  async afterDelete(media: Media): Promise<void> {
    // Run after deletion complete
  }
}
```

## Example 1: Image Compression Plugin

Compress images automatically on upload.

```ts
import type { AttachInput, MediaPlugin } from "droppjs";
import sharp from "sharp";

export class ImageCompressionPlugin implements MediaPlugin {
  constructor(
    private quality: number = 80,
    private maxWidth: number = 2000,
  ) {}

  async beforeUpload(input: AttachInput): Promise<void> {
    // Only process images
    if (!input.mimeType.startsWith("image/")) {
      return;
    }

    try {
      // Compress using Sharp
      let buffer = input.file as Buffer;

      // Resize if needed
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.width > this.maxWidth) {
        buffer = await sharp(buffer)
          .resize(this.maxWidth, undefined, {
            withoutEnlargement: true,
          })
          .webp({ quality: this.quality })
          .toBuffer();

        input.mimeType = "image/webp";
      } else {
        // Just compress
        buffer = await sharp(buffer).webp({ quality: this.quality }).toBuffer();

        input.mimeType = "image/webp";
      }

      // Replace original file with compressed version
      input.file = buffer;
      input.fileName = input.fileName.replace(/\.\w+$/, ".webp");

      // Track that compression happened
      if (!input.metadata) {
        input.metadata = {};
      }
      input.metadata.compressed = true;
      input.metadata.compressionQuality = this.quality;
    } catch (error) {
      console.error("Compression failed:", error);
      // Continue anyway, don't break upload
    }
  }
}

// Usage
const dropp = new Dropp({
  repository,
  storage,
  transformer,
  plugins: [
    new ImageCompressionPlugin(80, 2000), // 80% quality, max 2000px
  ],
});

// When user uploads, it's automatically compressed
const media = await dropp.attach({
  file: largeBuffer, // e.g., 5MB uncompressed
  fileName: "photo.jpg",
  mimeType: "image/jpeg",
  model: "posts",
  modelId: "1",
});

console.log(media.metadata.compressed); // true
console.log(media.url); // Points to webp version
```

---

## Example 2: Metadata Enrichment Plugin

Extract EXIF data and detect object categories automatically.

```ts
import type { Media, MediaPlugin } from "droppjs";
import piexifjs from "piexifjs"; // or your EXIF library
import Clarifai from "clarifai"; // or your vision API

export class MetadataEnrichmentPlugin implements MediaPlugin {
  constructor(private clarifaiApiKey: string) {}

  async afterUpload(media: Media): Promise<void> {
    // Only process images
    if (!media.mimeType.startsWith("image/")) {
      return;
    }

    const enriched = {
      ...media.metadata,
    };

    // Example: Extract EXIF if available
    if (media.metadata?.exifData) {
      enriched.extractedExif = this.parseExif(media.metadata.exifData);
    }

    // Example: Call vision API for object detection
    try {
      const objects = await this.detectObjects(media.url);
      enriched.detectedObjects = objects;
      enriched.tags = [
        ...(media.metadata?.tags ? [media.metadata.tags].flat() : []),
        ...objects.map((o) => o.label),
      ];
    } catch (error) {
      console.warn("Object detection failed:", error);
    }

    // Update metadata (if repository supports it)
    // Note: This is pseudo-code; actual update depends on repository
    await this.updateMediaMetadata(media.id, enriched);
  }

  private parseExif(exifData: unknown): Record<string, unknown> {
    // Parse EXIF bytes to readable data
    try {
      const parsed = piexifjs.load(exifData as string);
      return {
        dateTime: parsed["0th"][306],
        camera: parsed["0th"][271],
        cameraModel: parsed["0th"][272],
        software: parsed["0th"][305],
      };
    } catch {
      return {};
    }
  }

  private async detectObjects(
    url: string,
  ): Promise<Array<{ label: string; confidence: number }>> {
    // Call Clarifai API or similar
    const response = await fetch(
      `https://api.clarifai.com/v2/models/aaa03c23b3724a16a56b629203edc62c/outputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${this.clarifaiApiKey}`,
        },
        body: JSON.stringify({
          inputs: [
            {
              data: {
                image: {
                  url,
                },
              },
            },
          ],
        }),
      },
    );

    const data = (await response.json()) as any;
    return (
      data.outputs?.[0]?.data?.concepts?.map((c: any) => ({
        label: c.name,
        confidence: c.value,
      })) ?? []
    );
  }

  private async updateMediaMetadata(
    mediaId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    // This would call your repository
    // Example: db.media.update({ id: mediaId }, { metadata })
    console.log("Metadata enriched for", mediaId, metadata);
  }
}

// Usage
const dropp = new Dropp({
  repository,
  storage,
  plugins: [new MetadataEnrichmentPlugin(process.env.CLARIFAI_API_KEY!)],
});

const media = await dropp.attach({
  file: buffer,
  fileName: "wildlife.jpg",
  mimeType: "image/jpeg",
  model: "posts",
  modelId: "1",
});

console.log(media.metadata.detectedObjects); // [{ label: 'lion', confidence: 0.95 }, ...]
console.log(media.metadata.tags); // ['lion', 'safari', ...]
```

---

## Example 3: Cleanup/Notification Plugin

Trigger cleanup when media is deleted (e.g., notify external services).

```ts
import type { Media, MediaPlugin } from "droppjs";

export class CleanupPlugin implements MediaPlugin {
  constructor(private webhookUrl: string) {}

  async beforeDelete(media: Media): Promise<void> {
    // Validate before deletion
    if (!media.id) {
      throw new Error("Cannot delete media without ID");
    }

    console.log(`Preparing to delete: ${media.fileName}`);
  }

  async afterDelete(media: Media): Promise<void> {
    // Notify external services after safe deletion
    try {
      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "media.deleted",
          mediaId: media.id,
          fileName: media.fileName,
          model: media.model,
          modelId: media.modelId,
          timestamp: new Date().toISOString(),
        }),
      });

      console.log(`✓ Notified cleanup webhook for ${media.id}`);
    } catch (error) {
      // Don't throw; deletion already completed
      console.warn("Webhook notification failed:", error);
    }
  }
}

// Usage
const dropp = new Dropp({
  repository,
  storage,
  plugins: [
    new CleanupPlugin("https://api.example.com/webhooks/media-deleted"),
  ],
});

// When deleted, external service is notified
await dropp.delete(mediaId);
// → POST to webhook with event data
```

---

## Example 4: Validation Plugin

Strict validation on upload (e.g., brand compliance).

```ts
import type { AttachInput, MediaPlugin } from "droppjs";

export class BrandCompliancePlugin implements MediaPlugin {
  private allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

  private maxFileSize = 10 * 1024 * 1024; // 10MB

  async beforeUpload(input: AttachInput): Promise<void> {
    // 1. Check MIME type
    if (!this.allowedMimeTypes.includes(input.mimeType)) {
      throw new Error(
        `MIME type ${input.mimeType} not allowed. Only: ${this.allowedMimeTypes.join(", ")}`,
      );
    }

    // 2. Check file size
    const buffer = input.file as Buffer;
    if (buffer.length > this.maxFileSize) {
      throw new Error(
        `File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB. Max: 10MB`,
      );
    }

    // 3. Check required metadata
    if (!input.metadata?.uploadedBy) {
      throw new Error("uploadedBy is required in metadata");
    }

    // 4. Enforce naming convention
    if (!input.fileName.match(/^[a-z0-9-_.]+$/i)) {
      throw new Error(
        "File names must contain only letters, numbers, hyphens, underscores, dots",
      );
    }
  }
}

// Usage
const dropp = new Dropp({
  repository,
  storage,
  plugins: [new BrandCompliancePlugin()],
});

// Will fail validation
try {
  await dropp.attach({
    file: buffer,
    fileName: "INVALID FILE!.jpg", // ← Invalid name
    mimeType: "image/jpeg",
    model: "posts",
    modelId: "1",
    metadata: { uploadedBy: "user1" },
  });
} catch (error) {
  console.error(error.message);
  // "File names must contain only letters, numbers, hyphens, underscores, dots"
}

// Will pass
const media = await dropp.attach({
  file: buffer,
  fileName: "valid-file-name.jpg", // ✓
  mimeType: "image/jpeg",
  model: "posts",
  modelId: "1",
  metadata: { uploadedBy: "user1" },
});
```

---

## Plugin Lifecycle Diagram

```
attach() called
    ↓
beforeUpload hooks run (all plugins)
    ↓ (can throw error to cancel)
File uploaded to storage
    ↓
Metadata saved to repository
    ↓
afterUpload hooks run (all plugins)
    ↓ (errors logged but don't fail attach)
Media returned
```

```
delete() called
    ↓
beforeDelete hooks run (all plugins)
    ↓ (can throw error to cancel)
File deleted from storage
    ↓
Record deleted from repository
    ↓
afterDelete hooks run (all plugins)
    ↓ (informational only)
Complete
```

---

## Best Practices

### Do's

✅ **Keep beforeUpload fast** — This blocks the upload. Cache expensive operations.

✅ **Log errors in afterUpload** — Don't throw; upload already succeeded.

✅ **Implement idempotency** — Multiple calls should be safe.

✅ **Handle missing optional data** — Some files may lack EXIF, objects, etc.

✅ **Type your plugin** — Export types so users know what to expect.

### Don'ts

❌ **Don't modify the original file buffer** — Create a new one.

❌ **Don't throw in afterUpload** — Use logging instead.

❌ **Don't make infinite loops** — Plugin → attach → plugin again.

❌ **Don't expose secrets in error messages** — API keys should stay hidden.

---

## Publishing Your Plugin

If you build a useful plugin, consider publishing it:

```json
{
  "name": "dropp-plugin-compression",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "droppjs": ">=0.1.0",
    "sharp": ">=0.30.0"
  }
}
```

Install and use:

```bash
npm install dropp-plugin-compression
```

```ts
import { ImageCompressionPlugin } from "dropp-plugin-compression";

const dropp = new Dropp({
  repository,
  storage,
  plugins: [new ImageCompressionPlugin(80, 2000)],
});
```

---

## Testing Your Plugin

Unit test plugin hooks:

```ts
import { describe, it, expect } from "vitest";
import { ImageCompressionPlugin } from "./ImageCompressionPlugin";

describe("ImageCompressionPlugin", () => {
  it("compresses images on beforeUpload", async () => {
    const plugin = new ImageCompressionPlugin(80, 2000);

    const input = {
      file: Buffer.from("fake jpeg data"),
      fileName: "large.jpg",
      mimeType: "image/jpeg",
      model: "posts",
      modelId: "1",
    };

    await plugin.beforeUpload(input);

    expect(input.mimeType).toBe("image/webp");
    expect(input.fileName).toMatch(/\.webp$/);
    expect(input.metadata?.compressed).toBe(true);
  });

  it("skips non-image files", async () => {
    const plugin = new ImageCompressionPlugin();

    const input = {
      file: Buffer.from("pdf data"),
      fileName: "document.pdf",
      mimeType: "application/pdf",
      model: "posts",
      modelId: "1",
    };

    const original = input.file;
    await plugin.beforeUpload(input);

    expect(input.file).toBe(original); // Unchanged
  });
});
```

---

## Reference

| Hook           | Lifecycle      | Can Throw?      | Can Modify Input? |
| -------------- | -------------- | --------------- | ----------------- |
| `beforeUpload` | Before storage | ✓ Yes (cancels) | ✓ Yes             |
| `afterUpload`  | After storage  | ✗ No            | ✗ No              |
| `beforeDelete` | Before delete  | ✓ Yes (cancels) | ✗ No              |
| `afterDelete`  | After delete   | ✗ No            | ✗ No              |

---

## Next Steps

- [Cookbook](COOKBOOK.md) — Real-world usage examples
- [API Reference](API_REFERENCE.md) — Plugin interface types
- [Plugin Guide](PLUGIN_GUIDE.md) — Config-based plugin management
