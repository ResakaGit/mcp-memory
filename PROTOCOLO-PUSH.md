# Protocolo de push — mcp-memory-server

**Protocolo completo:** [personal-mcps/docs/PROTOCOLO-PUSH-MCP.md](../docs/PROTOCOLO-PUSH-MCP.md)

---

## Pre-push (desde esta carpeta)

1. **Versión** — actualizar `package.json` (major/minor/patch).
2. **Changelog** — si existe `CHANGELOG.md`, registrar el cambio.
3. **Docs** — actualizar docs/README si aplica.
4. **Build** — `npm run build`
5. **Test** — `npm run test`

Si algo falla, no hacer push.

```bash
npm run build && npm run test
git status && git add . && git commit -m "tipo: mensaje" && git push
```
