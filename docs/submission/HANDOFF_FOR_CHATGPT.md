# GhostBridge: informe completo para revisión (Kiroween 2026)

Preparado por Kiro (sesión `sess_7ff31803-702e-41e9-b5b1-55b645f7262e`, Kiro IDE, Autopilot) el 2026-11-18.
Repositorio público: https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026 (licencia MIT).
Fecha límite del concurso: viernes 4 de diciembre de 2026, 14:00 hora del Pacífico.

Términos de estado usados en todo el informe:
- **IMPLEMENTADO:** existe en el repositorio.
- **EJECUTADO:** se corrió.
- **VERIFICADO:** su resultado se comprobó de forma independiente o con pruebas.
- **NO PROBADO:** no hay evidencia.

---

## 1. Resumen

GhostBridge convierte señales **sintéticas** de sistemas de edificio antiguos (relés, lectores de tarjetas, cámaras) en un incidente explicado y verificable con una cadena SHA-256. No se conecta a hardware real, clientes ni InnerOS.

El trabajo nuevo está en una pila de **cuatro PR en borrador**. Ninguno está integrado en `main`, así que el sitio público todavía muestra la versión anterior.

| PR | Contenido | Autor | Base | Head | CI |
|---|---|---|---|---|---|
| [#10](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/10) | Signal Forge: crear tu propio incidente | ChatGPT/Codex (no Kiro) | `main` | `82d9de8` | verde |
| [#14](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/14) | Control Room inmersivo, retos 299/120 y 301/119, Showcase Mode | Kiro | `feat/signal-forge-interactive` | `28451fc` | verde |
| [#15](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/15) | Agentes propios ejecutados, hooks probados, servidor MCP | Kiro | `feat/kiro-immersive-control-room` | `2dffd0c` | verde |
| [#16](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/16) | Incident Time Machine, Evidence Trust Lab, accesibilidad, paquete de concurso | Kiro (+ agentes ui-director y qa-auditor) | `feat/kiro-agentic-validation` | `55465e6` | verde |

GitHub marca los cuatro como `MERGEABLE` / `CLEAN`.

## 2. Resultados de pruebas (medidos)

| Suite | Resultado | Dónde |
|---|---|---|
| Python `unittest` | 188 OK | local y CI del #16 |
| Node, 19 archivos | 382 de 382 | local y CI del #16 |
| `node --check` (17 módulos `docs/*.mjs` + `app.js`) | 18 de 18 | local |
| Chrome: experiencia Fase 6 | 159/159 | `docs/evidence/phase6/final-qa/` |
| Chrome: auditoría independiente de qa-auditor | 39/39 | ídem |
| Chrome: accesibilidad / enlace de salto / foco del Forge | 39/39, 32/32, 40/40 | ídem |
| Chrome: Signal Forge (m0) / Control Room (m5) | 56/56, 141/141, sin reintentos | ídem |
| **Prueba de integración** (`main` + la pila completa, en una copia temporal) | sin conflictos; Python 188 OK, Node 382/382, 18/18 | sección 6 |

Las pruebas de Chrome se ejecutan a mano y no forman parte del CI, porque el CI no tiene navegador. Se probó solo Chrome 157, y el ancho de 390 px es emulado. No hubo lector de pantalla, así que no se afirma cumplimiento WCAG.

## 3. Uso real de Kiro (con evidencia)

| Función de Kiro | Estado | Evidencia |
|---|---|---|
| Specs | VERIFICADO | `.kiro/specs/*/` (requirements, design, tasks por funcionalidad) |
| Steering | VERIFICADO | `.kiro/steering/` y tests que hacen cumplir sus reglas |
| Hooks | EJECUTADO y VERIFICADO | `guard-destructive` se ejecutó en cada comando de shell y bloqueó comandos de prueba, entre ellos un force-push. `reconstruction-tests-on-save` se disparó al guardar y dejó un log con 82/82. Ver `docs/evidence/agentic-validation/REPORT.md` sección 4 |
| Agentes propios | EJECUTADO y VERIFICADO | `ui-director` corrió 4 veces y `qa-auditor` 5 veces, de forma real. El log de sesión registra `sub_agent_start` con el nombre. Ver `docs/evidence/agentic-validation/sub-executions.json`, `docs/evidence/phase6/qa-auditor-*.md` |
| Bucle auditoría → corrección → reauditoría | VERIFICADO | qa-auditor encontró defectos reales que se corrigieron (ver lista abajo) |
| Pruebas basadas en propiedades | VERIFICADO | semillas fijas: 400 configuraciones aleatorias, 231 exhaustivas y 300 manipulaciones del ledger; mutaciones deliberadas detectadas 8 de 8 |
| MCP | VERIFICADO desde Kiro | instalado, conectado y con 14 llamadas reales. Las 4 herramientas devuelven lo esperado, incluido `verify_ledger`: ledger válido 3 de 3 y ledger alterado falla en la fila 2 |
| Powers | NO USADO | no hay ninguno instalado; los oficiales requieren cuentas externas. No afirmarlo |
| Kiro Crew | NO CONSTRUIDO | no existe una app nativa de Crew. En `main` hay un spec de Crew del propietario (`.kiro/specs/ghostbridge-crew-app/`), pero no está implementado. No postular a ese premio |
| Créditos consumidos | NO MEDIBLE | la sesión no los expone. Revisar en https://kiro.dev/account/usage |

**Defectos reales encontrados por qa-auditor y corregidos:**
- foco perdido al abrir Signal Forge;
- horas calculadas mostradas como si fueran registradas;
- encabezados de autoría incorrectos;
- botón Restore activo sin experimento (causado por `app.js`);
- un archivo suelto creado por error;
- entrada MCP muy anidada que producía un error interno en vez de un error claro.

**Atribución:**
- La base del laboratorio, `engine.mjs` y Signal Forge (#10) son de ChatGPT/Codex.
- Los PR #2, #4, #5, #8, #14, #15 y #16 son de Kiro.
- En el #16, los modelos puros son de la sesión principal de Kiro, y las vistas, de `ui-director`.

## 4. Qué hace el producto (para el jurado)

1. **Reto A, 299 s / 120 s:** el lector se pone rojo, la puerta se abre, y solo cuando lleva 120 s abierta aparece el vínculo del caso, con dos hashes de evidencia.
2. **Reto B, 301 s / 119 s:** no hay caso, y el texto dice que falla por 1 s en cada condición.
3. **Incident Time Machine:** recorre el incidente en 8 pasos, y el edificio muestra cada momento. Las horas calculadas se marcan como "derivadas, no registradas".
4. **Evidence Trust Lab:** se altera un campo en una copia, la copia falla exactamente en esa fila y el ledger original sigue verificado.
5. **Antes y después:** de alarmas sueltas a un incidente explicado, con pasos recomendados que son solo texto y no controlan dispositivos.
6. **Showcase Mode:** un recorrido de unos 58 s, en `?present=1`.

Guía del jurado: `docs/submission/JUDGE_GUIDE.md`.

## 5. Pendientes y riesgos (honestos)

1. **El sitio público no muestra este trabajo.** `https://ghostbridge.innerchispa.us/` se construye desde `main`. Hay que integrar la pila (sección 6).
2. **`verify_ledger` desde Kiro: RESUELTO y VERIFICADO el 2026-11-18.**
   - **Lo observado antes:** las filas con un objeto vacío (`"data": {}`) fallaban cuando se enviaban como estructura desde Kiro. El objeto vacío se pierde en el camino y eso cambia el hash.
   - **La corrección:** el servidor acepta el ledger como texto JSON (`rows_json`), que llega intacto, y sigue siendo estricto. Tiene 19 tests.
   - **La prueba desde Kiro:** después de que el propietario actualizó Kiro, un ledger válido de 3 filas verificó 3 de 3, con el mismo head que calculó el motor. La misma copia con la hora de la fila 2 alterada falló exactamente en la fila 2.
   - **Nota para clientes MCP:** usar `rows_json` para verificar. El parámetro `rows` (estructura) sigue disponible, pero puede fallar si el cliente descarta objetos vacíos.
   - Detalle completo: `docs/evidence/phase6/mcp-from-kiro.md`.
3. **`.kiro/inbox/win_kiro_bridge_e2e_probe.json`:** viene del puente de Antigravity. Está fuera del repositorio y no se modificó.
4. **Borradores duplicados:** `main` tiene `docs/marketing/KIROWEEN_2026_BLOG_DRAFT.md` y `..._SOCIAL_BLITZ_DRAFT.md`, y la Fase 6 añadió `docs/submission/BLOG_AND_SOCIAL_DRAFTS.md`. Hay que unificarlos antes de publicar.
5. **Pendiente para el envío:** video (guion en `docs/submission/VIDEO_SCRIPT.md`), formulario de Devpost, selección de categoría (Resurrection) y datos de fundador si se postula a Best Startup Project. Nada de esto se ha publicado ni enviado.
6. **Menores aceptados:**
   - La regla del caso fallido excusa una frase que contiene la negación en cualquier lugar.
   - Los botones Run y Close en móvil se comprueban solo a 390 px.

## 6. Orden de integración propuesto (requiere aprobación del propietario)

Antes de proponerlo, se comprobó en una copia temporal que `main` + la pila completa no tiene conflictos y pasa todas las pruebas. `main` tiene 9 commits que no están en la pila; son solo documentos y specs, sin código.

**Importante: cada merge a `main` publica el sitio automáticamente** (`.github/workflows/pages.yml` se ejecuta en cada push a `main`). Conviene hacer los cuatro pasos seguidos, en una misma sesión.

Usar **"Create a merge commit"**, no "Squash". Con squash, cada PR siguiente volvería a mostrar los commits ya integrados.

1. **PR #10:** marcarlo "Ready for review" y hacer merge en `main`. Esperar a que terminen el CI y el despliegue de Pages.
2. **PR #14:** cambiar su base a `main` (Edit → base `main`). Si se borró la rama de #10, GitHub lo hace solo. Comprobar que el diff muestra solo los cambios del #14 y esperar el CI verde. Luego Ready y merge.
3. **PR #15:** cambiar su base a `main`, esperar el CI verde, y luego Ready y merge.
4. **PR #16:** cambiar su base a `main`, esperar el CI verde, y luego Ready y merge.
5. **Revisar el sitio publicado:** abrir `https://ghostbridge.innerchispa.us/` y ejecutar los retos A y B, la Time Machine, el Trust Lab y `?present=1`. Si se quiere, Kiro puede volver a correr las pruebas de Chrome contra la versión integrada.

Equivalente con `gh`, para usar solo tras la aprobación:
```
gh pr ready 10 && gh pr merge 10 --merge
gh pr edit 14 --base main && gh pr checks 14 --watch && gh pr ready 14 && gh pr merge 14 --merge
gh pr edit 15 --base main && gh pr checks 15 --watch && gh pr ready 15 && gh pr merge 15 --merge
gh pr edit 16 --base main && gh pr checks 16 --watch && gh pr ready 16 && gh pr merge 16 --merge
```
**Para deshacer** si algo sale mal tras un merge: `git revert -m 1 <commit de merge>` en una rama nueva, con un PR hacia `main`. No usar force-push en `main`.

## 7. Dónde está cada cosa

| Qué | Ruta en el repositorio (rama `feat/kiro-winning-experience`) |
|---|---|
| Este informe | `docs/submission/HANDOFF_FOR_CHATGPT.md` |
| Checklist de elegibilidad | `docs/submission/ELIGIBILITY.md` |
| Guía del jurado / guion de video / borradores de blog y redes | `docs/submission/JUDGE_GUIDE.md`, `VIDEO_SCRIPT.md`, `BLOG_AND_SOCIAL_DRAFTS.md` |
| Estado de la Fase 6 | `docs/evidence/phase6/STATUS.md` |
| Informes de qa-auditor | `docs/evidence/phase6/qa-auditor-phase6.md`, `-reaudit.md`, `-closing.md` |
| Llamadas MCP desde Kiro | `docs/evidence/phase6/mcp-from-kiro.md` |
| Logs finales de Chrome | `docs/evidence/phase6/final-qa/` |
| Historia completa de fases | `docs/KIRO_EVIDENCE.md` |
| Evidencia de agentes y hooks (Fase 5) | `docs/evidence/agentic-validation/REPORT.md` |
| Servidor MCP | `ghostbridge/mcp_server.py`, `.kiro/mcp/README.md`, `.kiro/settings/mcp.json` |
