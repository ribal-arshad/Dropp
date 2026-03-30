# Plugin Guide

Plugins let you add custom behavior to Dropp without editing core code.

Which is great, because editing core code at 2AM is a lifestyle we do not recommend.

## Built-in plugins

- Watermark
- AI Tagging
- SEO

## Manage plugins from CLI

- `dropp plugin:install <name>`
- `dropp plugin:list`
- `dropp plugin:remove <name>`

## Lifecycle hooks

- `beforeUpload`
- `afterUpload`
- `beforeDelete`
- `afterDelete`

Use hooks to validate inputs, enrich metadata, or trigger side effects.

## Config example

```json
{
  "plugins": {
    "watermark": {
      "enabled": true,
      "config": {
        "text": "© My Brand",
        "position": "bottomRight",
        "opacity": 0.7
      }
    }
  }
}
```

## Best practices

- Keep plugins focused on one clear responsibility
- Validate config on startup
- Keep upload-path hooks fast
- Fail with clear error messages

Your future teammate (possibly also you) will thank you.

## More details

- API reference: [API_REFERENCE.md](API_REFERENCE.md)
- CLI reference: [CLI_REFERENCE.md](CLI_REFERENCE.md)
