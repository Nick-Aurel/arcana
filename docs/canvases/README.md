# Canvas sources (versioned)

These `.canvas.tsx` files are **kept in git** so the architecture visuals survive outside Cursor.

Cursor only **renders** canvases from its managed folder:

```
~/.cursor/projects/Users-nick-aurelmugirashaka-Hackathons-arcana/canvases/
```

| File | Open in Cursor as |
| --- | --- |
| `notion-architecture.canvas.tsx` | Notion Architecture |
| `arcana-architecture.canvas.tsx` | Arcana Architecture |
| `mvp-roadmap.canvas.tsx` | Arcana MVP Roadmap |

After cloning, copy into the managed folder to reopen beside chat:

```bash
cp docs/canvases/*.canvas.tsx \
  ~/.cursor/projects/Users-nick-aurelmugirashaka-Hackathons-arcana/canvases/
```

Markdown companions with Mermaid live one level up in `docs/`.
