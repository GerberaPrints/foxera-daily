# SECRETS-MAP — cho nao da bi che trong ban sao luu

Sinh boi `gp-redact-secrets.py` ngay 20/08/2026.

**Ban sao luu nay CHI-DOC.** Tuyet doi khong `clasp push` tu day:
se ghi `__REDACTED__` de len production.

Gia tri that chi ton tai o 2 noi: Apps Script (ban song) va
Script Properties. File nay chi ghi VI TRI, khong ghi gia tri.

| File | Dong | Loai bi mat |
|---|---|---|
| `Gerberaprints CRM.js` | 27 | Shopify Admin API token |
| `GP_Klaviyo.js` | 107 | Klaviyo private key |
| `GP_Klaviyo.js` | 108 | Klaviyo webhook secret |

## Viec nen lam tiep (khong gap, nhung nen)

Chuyen credential ra **Script Properties** roi doc luc runtime.
Codebase DA co san mau nay: `_CAPI.ACCESS_TOKEN` de rong va doc tu
Properties. Lam giong vay cho SHOPIFY_TOKEN va khoa Klaviyo thi
lan sau sao luu khong con vuong Push Protection nua.
